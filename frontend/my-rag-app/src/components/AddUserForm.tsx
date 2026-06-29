interface AddUserFormProps {
  setShowAddUser: React.Dispatch<
    React.SetStateAction<boolean>
  >;
}

export default function AddUserForm({
  setShowAddUser,
}: AddUserFormProps) {


<div className="px-8 py-8">

  <h2 className="text-2xl font-bold dark:text-slate-100 mb-8">
    Add New User
  </h2>

  <div className="space-y-6">

    <div>
      <label className="text-slate-400">
        First Name
      </label>

      <input
        className="
          mt-2
          w-full
          h-12

          rounded-2xl

          bg-white
          dark:bg-[#1E2A44]

          border
          border-slate-200
          dark:border-[#334155]

          px-4
        "
      />
    </div>

    <div>
      <label className="text-slate-400">
        Last Name
      </label>

      <input
        className="
          mt-2
          w-full
          h-12

          rounded-2xl

          bg-white
          dark:bg-[#1E2A44]

          border
          border-slate-200
          dark:border-[#334155]

          px-4
        "
      />
    </div>

    <div>
      <label className="text-slate-400">
        Job Title
      </label>

      <input
        className="
          mt-2
          w-full
          h-12

          rounded-2xl

          bg-white
          dark:bg-[#1E2A44]

          border
          border-slate-200
          dark:border-[#334155]

          px-4
        "
      />
    </div>

    <div>
      <label className="text-slate-400">
        Birth Date
      </label>

      <input
        type="date"
        className="
          mt-2
          w-full
          h-12

          rounded-2xl

          bg-white
          dark:bg-[#1E2A44]
            
          border
          border-slate-200
          dark:border-[#334155]

          px-4
        "
      />
    </div>

  </div>

  <div className="flex justify-end gap-4 mt-10">

    <button
      onClick={() => setShowAddUser(false)}
      className="
        px-6
        py-3

        rounded-2xl

        border
        border-slate-300
        dark:border-[#334155]
        
        dark:text-slate-300
        transition-all
      "
    >
      Cancel
    </button>

    <button
      className="
        px-6
        py-3

        rounded-2xl

        bg-[#2A4B8D]
        hover:bg-[#3562B8]

        text-white

        transition-all
      "
    >
      Save User
    </button>

  </div>

</div>
}