import io
import socket
import ssl
import unittest
from unittest.mock import MagicMock, patch
from urllib.request import Request

from app.services import connector_sync as sync


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
