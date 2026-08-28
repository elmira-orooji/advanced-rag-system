import io
import hashlib
import json
import socket
import ssl
import unittest
from unittest.mock import MagicMock, patch
from urllib.request import Request
from types import SimpleNamespace
from uuid import uuid4

from app.services import connector_sync as sync


class ConnectorDeletionTests(unittest.TestCase):
    def run_github_sync(self, count, truncated=False):
        body = b"A supported document with enough text."
        tree = [{"type": "blob", "path": f"{i}.md", "size": 100} for i in range(count)]
        metadata = json.dumps({"tree": tree, "truncated": truncated}).encode()
        db = MagicMock()
        connector = SimpleNamespace(id=uuid4(), document_set_id=uuid4(), connector_type="github", source_url="https://github.com/owner/repo")
        items = [SimpleNamespace(external_id=f"{i}.md", document_id=uuid4(), content_hash=hashlib.sha256(body).hexdigest()) for i in range(count)]
        missing = SimpleNamespace(external_id="absent.md", document_id=uuid4())
        db.scalars.return_value.all.return_value = items + [missing]
        document = SimpleNamespace(id=missing.document_id, document_sets=[SimpleNamespace(id=connector.document_set_id)])
        db.get.return_value = document
        with patch.object(sync, "_validate_public_url"), patch.object(sync, "_fetch", side_effect=lambda url, *args: (metadata if "api.github.com" in url else body, "text/plain", url)), patch.object(sync, "QdrantClient") as qdrant, patch.object(sync.shutil, "rmtree") as remove:
            result = sync.sync_connector(db, connector)
        return result, db, qdrant.return_value, remove

    def test_github_limit_does_not_delete_unfetched_documents(self):
        result, db, qdrant, remove = self.run_github_sync(41)
        self.assertEqual(result["unchanged"], 40)
        self.assertEqual(result["deleted"], 0)
        db.delete.assert_not_called()
        qdrant.delete_document.assert_not_called()
        remove.assert_not_called()

    def test_github_truncated_tree_does_not_delete_documents(self):
        result, db, qdrant, remove = self.run_github_sync(2, truncated=True)
        self.assertEqual(result["deleted"], 0)
        db.delete.assert_not_called()
        qdrant.delete_document.assert_not_called()

    def test_complete_github_tree_still_deletes_missing_document(self):
        result, db, qdrant, remove = self.run_github_sync(2)
        self.assertEqual(result["deleted"], 1)
        qdrant.delete_document.assert_called_once()

    def test_s3_limit_marks_listing_incomplete(self):
        listing = ("<ListBucketResult><IsTruncated>false</IsTruncated>" + "".join(f"<Contents><Key>{i}.md</Key></Contents>" for i in range(101)) + "</ListBucketResult>").encode()
        with patch.object(sync, "_aws_signed_get", side_effect=lambda url: listing if "list-type" in url else b"Enough text for this supported document."):
            result = sync._s3("https://bucket.s3.amazonaws.com/")
        self.assertFalse(result.complete)
        self.assertIn("100.md", result.observed_ids)

    def test_s3_truncated_listing_is_incomplete(self):
        with patch.object(sync, "_aws_signed_get", return_value=b"<ListBucketResult><IsTruncated>true</IsTruncated></ListBucketResult>"):
            self.assertFalse(sync._s3("https://bucket.s3.amazonaws.com/").complete)

    def test_google_drive_pagination_and_incomplete_search_disable_deletion(self):
        for marker in ({"nextPageToken": "next"}, {"incompleteSearch": True}):
            with self.subTest(marker=marker), patch.multiple(sync, GOOGLE_CLIENT_ID="test", GOOGLE_CLIENT_SECRET="test", GOOGLE_REFRESH_TOKEN="test"), patch.object(sync, "_oauth_token", return_value="token"), patch.object(sync, "_authorized_json", return_value={"files": [], **marker}) as request:
                self.assertFalse(sync._google_drive("https://drive.google.com/drive/folders/folder").complete)
                self.assertIn("nextPageToken", request.call_args.args[0])
                self.assertIn("incompleteSearch", request.call_args.args[0])

    def test_sharepoint_next_link_disables_deletion(self):
        with patch.multiple(sync, MICROSOFT_TENANT_ID="test", MICROSOFT_CLIENT_ID="test", MICROSOFT_CLIENT_SECRET="test"), patch.object(sync, "_oauth_token", return_value="token"), patch.object(sync, "_authorized_json", return_value={"value": [], "@odata.nextLink": "next"}):
            self.assertFalse(sync._sharepoint("https://graph.microsoft.com/drive/root/children").complete)

    def test_seen_but_skipped_file_is_preserved_even_with_complete_listing(self):
        db = MagicMock()
        item = SimpleNamespace(external_id="short.md", document_id=uuid4())
        db.scalars.return_value.all.return_value = [item]
        connector = SimpleNamespace(id=uuid4(), document_set_id=uuid4(), connector_type="github", source_url="https://github.com/owner/repo")
        metadata = json.dumps({"tree": [{"type": "blob", "path": "short.md", "size": 3}, {"type": "blob", "path": "large.md", "size": 400000}], "truncated": False}).encode()
        # A supported file keeps this fetch successful; the short and oversized
        # files must still be recorded as present in the source inventory.
        metadata = json.loads(metadata)
        metadata["tree"].append({"type": "blob", "path": "good.md", "size": 100})
        body = b"Enough content to index this supported file."
        db.scalars.return_value.all.return_value += [SimpleNamespace(external_id="good.md", document_id=uuid4(), content_hash=hashlib.sha256(body).hexdigest()), SimpleNamespace(external_id="large.md", document_id=uuid4())]
        def fetch(url, *args):
            data = json.dumps(metadata).encode() if "api.github.com" in url else (b"abc" if "short.md" in url else body)
            return data, "text/plain", url
        with patch.object(sync, "_validate_public_url"), patch.object(sync, "_fetch", side_effect=fetch), patch.object(sync, "QdrantClient") as qdrant:
            result = sync.sync_connector(db, connector)
        self.assertEqual(result["deletion_skipped"], 0)
        self.assertEqual(result["deleted"], 0)
        db.delete.assert_not_called()
        qdrant.return_value.delete_document.assert_not_called()

    def test_failed_fetch_does_not_start_reconciliation(self):
        db = MagicMock()
        connector = SimpleNamespace(connector_type="github", source_url="https://github.com/owner/repo")
        with patch.object(sync, "_github", side_effect=sync.ConnectorSyncError("Download failed")), patch.object(sync, "QdrantClient") as qdrant:
            with self.assertRaises(sync.ConnectorSyncError):
                sync.sync_connector(db, connector)
        db.delete.assert_not_called()
        db.commit.assert_not_called()
        qdrant.assert_not_called()


def addresses(ip):
    family = socket.AF_INET6 if ":" in ip else socket.AF_INET
    return [(family, socket.SOCK_STREAM, 6, "", (ip, 443))]


class ConnectorNetworkTests(unittest.TestCase):
    def test_nonpublic_addresses_are_rejected(self):
        for ip in ("127.0.0.1", "10.0.0.1", "169.254.169.254", "::1", "fc00::1", "::ffff:127.0.0.1"):
            with self.subTest(ip=ip), patch.object(sync.socket, "getaddrinfo", return_value=addresses(ip)):
                with self.assertRaises(sync.ConnectorSyncError):
                    sync._validate_public_url("https://example.com")

    def test_empty_dns_result_is_rejected(self):
        with patch.object(sync.socket, "getaddrinfo", return_value=[]):
            with self.assertRaises(sync.ConnectorSyncError):
                sync._validate_public_url("https://example.com")

    def test_redirect_to_private_host_is_rejected_before_following(self):
        with patch.object(sync.socket, "getaddrinfo", return_value=addresses("127.0.0.1")):
            with self.assertRaises(sync.ConnectorSyncError):
                sync._PublicRedirectHandler().redirect_request(
                    Request("https://example.com"), None, 302, "Found", {}, "https://internal.local/"
                )

    def test_authenticated_redirect_is_rejected(self):
        with patch.object(sync.socket, "getaddrinfo", return_value=addresses("8.8.8.8")):
            with self.assertRaises(sync.ConnectorSyncError):
                sync._PublicRedirectHandler().redirect_request(
                    Request("https://example.com", headers={"Authorization": "Bearer secret"}),
                    None, 302, "Found", {}, "https://other.example/",
                )

    def test_public_redirect_is_allowed(self):
        with patch.object(sync.socket, "getaddrinfo", return_value=addresses("8.8.8.8")):
            result = sync._PublicRedirectHandler().redirect_request(
                Request("https://example.com"), None, 302, "Found", {}, "https://other.example/"
            )
        self.assertEqual(result.full_url, "https://other.example/")

    def test_connection_uses_validated_ip_without_second_dns_lookup(self):
        context = MagicMock()
        connection = sync._PublicHTTPSConnection("example.com", context=context)
        with patch.object(sync.socket, "getaddrinfo", side_effect=[addresses("8.8.8.8"), addresses("127.0.0.1")]) as dns, patch.object(sync.socket, "socket") as sock:
            connection.connect()
        dns.assert_called_once()
        sock.return_value.connect.assert_called_once_with(("8.8.8.8", 443))
        context.wrap_socket.assert_called_once_with(sock.return_value, server_hostname="example.com")

    def test_connection_blocks_private_dns_before_opening_socket(self):
        connection = sync._PublicHTTPSConnection("example.com")
        with patch.object(sync.socket, "getaddrinfo", return_value=addresses("10.0.0.1")), patch.object(sync.socket, "socket") as sock:
            with self.assertRaises(sync.ConnectorSyncError):
                connection.connect()
        sock.assert_not_called()

    def test_fetch_redirect_never_connects_to_internal_destination(self):
        def resolve(host, *args, **kwargs):
            return addresses("127.0.0.1" if host == "internal.local" else "8.8.8.8")

        with patch.object(sync.socket, "getaddrinfo", side_effect=resolve), patch.object(sync.socket, "socket") as sock, patch.object(ssl.SSLContext, "wrap_socket", side_effect=lambda value, **kwargs: value):
            sock.return_value.makefile.return_value = io.BytesIO(
                b"HTTP/1.1 302 Found\r\nLocation: https://internal.local/\r\nContent-Length: 0\r\n\r\n"
            )
            with self.assertRaises(sync.ConnectorSyncError):
                sync._fetch("https://example.com")
            sock.return_value.connect.assert_called_once_with(("8.8.8.8", 443))

    def test_public_fetch_reads_response_through_safe_transport(self):
        with patch.object(sync.socket, "getaddrinfo", return_value=addresses("8.8.8.8")), patch.object(sync.socket, "socket") as sock, patch.object(ssl.SSLContext, "wrap_socket", side_effect=lambda value, **kwargs: value):
            sock.return_value.makefile.return_value = io.BytesIO(
                b"HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 5\r\n\r\nhello"
            )
            self.assertEqual(sync._fetch("https://example.com"), (b"hello", "text/plain", "https://example.com"))

    def test_all_cloud_helpers_block_private_dns(self):
        calls = (
            lambda: sync._authorized_json("https://example.com", "secret"),
            lambda: sync._bearer_download("https://example.com", "secret"),
            lambda: sync._oauth_token("https://example.com", {"secret": "value"}),
            lambda: sync._aws_signed_get("https://bucket.s3.amazonaws.com/key"),
        )
        with patch.multiple(sync, AWS_ACCESS_KEY_ID="test", AWS_SECRET_ACCESS_KEY="test", AWS_REGION="us-east-1"), patch.object(sync.socket, "getaddrinfo", return_value=addresses("10.0.0.1")), patch.object(sync.socket, "socket") as sock:
            for call in calls:
                with self.subTest(call=call), self.assertRaises(sync.ConnectorSyncError):
                    call()
            sock.assert_not_called()
