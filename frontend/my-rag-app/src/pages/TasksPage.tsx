import {
  ArrowRight,
  ListTodo,
  Search,
} from "lucide-react";

export default function TasksPage() {
  return (
    <div className="p-8 h-full overflow-y-auto">

      <div
        className="
          rounded-3xl
          bg-white
          p-6
          border
          border-slate-100
          shadow-sm
          space-y-3
        "
      >

        {/* Task Header */}
        <div className="flex items-center justify-between mb-6">

          <div className="flex items-center gap-5">

            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <ListTodo
                size={20}
                className="text-slate-400"
              />

              <span>
                My Tasks
              </span>

              <span className="text-slate-400 font-normal text-xl">
                13
              </span>
            </h2>

            <div className="relative w-[190px]">

              <Search
                size={16}
                className="
                  absolute
                  left-4
                  top-1/2
                  -translate-y-1/2
                  text-slate-400
                "
              />

              <input
                placeholder="Search ..."
                className="
                  w-full
                  h-10
                  rounded-full
                  border border-slate-200
                  bg-white
                  pl-10
                  pr-10
                  text-sm
                  placeholder:text-slate-400
                  outline-none
                  focus:ring-2
                  focus:ring-slate-100
                "
              />

              <button
                className="
                  absolute
                  right-2
                  top-1/2
                  -translate-y-1/2

                  w-8
                  h-8

                  rounded-full
                  bg-slate-100

                  flex
                  items-center
                  justify-center

                  hover:bg-slate-200
                  transition-all
                  duration-300
                "
              >
                <ArrowRight
                  size={16}
                  className="text-slate-500"
                />
              </button>

            </div>

          </div>

        </div>

        {/* Task 1 */}
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-orange-500" />

          <span>Design Meeting</span>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm">
            2 pm
          </span>

          <span className="rounded-full bg-purple-100 text-purple-600 px-3 py-1 text-sm">
            Join now
          </span>
        </div>

        {/* Task 2 */}
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-red-500" />

          <span>
            Refine UI components based on user feedback
          </span>

          <span className="rounded-full bg-red-100 text-red-600 px-3 py-1 text-sm">
            Urgent
          </span>

          <span className="rounded-full bg-red-50 text-red-500 px-3 py-1 text-sm">
            By today
          </span>
        </div>

        {/* Task 3 */}
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-blue-500" />

          <span>
            Prepare a prototype for usability testing
          </span>

          <span className="rounded-full bg-blue-100 text-blue-600 px-3 py-1 text-sm">
            In progress
          </span>

          <span className="rounded-full bg-cyan-100 text-cyan-600 px-3 py-1 text-sm">
            By tomorrow
          </span>
        </div>

        {/* Task 4 */}
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-blue-500" />

          <span>
            Collaborate with developers on implementation detail
          </span>

          <span className="rounded-full bg-slate-100 text-slate-600 px-3 py-1 text-sm">
            To do
          </span>

          <span className="rounded-full bg-cyan-100 text-cyan-600 px-3 py-1 text-sm">
            By tomorrow
          </span>
        </div>

      </div>

    </div>
  );
}