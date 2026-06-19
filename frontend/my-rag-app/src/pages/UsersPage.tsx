import {
  UserPlus,
  Pencil,
  Trash2,
} from "lucide-react";


<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.25 }}
  className="grid grid-cols-12 h-full"
>
<div className="col-span-5 border-r border-slate-200 dark:border-slate-700">
    <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-700">

  <div className="flex items-center justify-between">

    <div className="flex items-center gap-3">
      <UserPlus
        size={22}
        className="text-blue-500"
      />

      <h1 className="text-3xl font-bold">
        Users
      </h1>
    </div>

    <button
      className="
        px-4
        py-2

        rounded-xl

        bg-cyan-400
        text-slate-900

        font-semibold
      "
    >
      Add User
    </button>

  </div>

</div>

<div
  className="
    grid
    grid-cols-4

    px-8
    py-4

    text-sm
    font-semibold

    text-slate-400
  "
>
  <span>FIRST NAME</span>
  <span>LAST NAME</span>
  <span>JOB TITLE</span>
  <span>ACTIONS</span>
</div>
<div className="space-y-4 px-6">

  {users.map((user) => (
    <div
      key={user.id}
      className="
        h-16

        rounded-3xl

        bg-white
        dark:bg-[#1E2A44]

        border
        border-slate-200
        dark:border-slate-700

        px-6

        grid
        grid-cols-4

        items-center
      "
    >
      <span>{user.firstName}</span>

      <span>{user.lastName}</span>

      <span>{user.jobTitle}</span>

      <div className="flex gap-2">
        <button>
          <Pencil size={18} />
        </button>

        <button>
          <Trash2
            size={18}
            className="text-red-400"
          />
        </button>
      </div>
    </div>
  ))}

</div>