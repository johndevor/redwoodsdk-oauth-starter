

import { RequestInfo } from "@redwoodjs/sdk/worker"
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover"
import { Button } from "@/app/components/ui/button"

export function SidebarUserClient({ ctx }: { ctx: RequestInfo['ctx'] }) {
  console.log('ctx', ctx)
  return (
    <div className="max-w-md flex justify-start bg-gray-200 w-full">
      {ctx.user ? (
        <Popover>
          {/* Assign a constant id so Radix uses it for aria-controls preventing hydration mismatches */}
          <PopoverTrigger asChild aria-controls="radix-:popovertrigger:">
            <button className="flex items-center p-2 pl-4  w-full hover:bg-gray-200 transition-colors">
              <div className="overflow-hidden rounded-full w-8 h-8 mr-2">
                <img src={ctx.user.image!} alt="" className="w-full h-full" />
              </div>
              <div className="flex flex-col text-sm text-left">
                <span className="block">{ctx.user.name}</span>
                <span className="block text-gray-600">{ctx.user.email}</span>
              </div>
            </button>
          </PopoverTrigger>
          {/* Assign a constant id so Radix uses it for aria-controls preventing hydration mismatches */}
          <PopoverContent id="sidebar-user-popover" className="w-56 ml-4 " align="start">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <div className="font-medium">Account</div>
                <div className="text-sm text-gray-500">
                  Manage your account settings
                </div>
              </div>
              <Button asChild variant="outline" className="w-full justify-start">
                <a href="/auth/signout" className="flex items-center">
                  <span>Sign out</span>
                </a>
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <Button asChild>
          <a href="/auth/signin">Sign in</a>
        </Button>
      )}
    </div>
  )
}