import { Calendar, Home, Inbox, Search, Settings } from "lucide-react"
import { Button } from "@/app/components/ui/button"
import { RequestInfo } from "@redwoodjs/sdk/worker"

import {
  Sidebar as SidebarComponent,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/app/components/ui/sidebar"

// Menu items.
const items = [
    {
      title: "Home",
      url: "#",
      icon: Home,
    },
    {
      title: "Inbox",
      url: "#",
      icon: Inbox,
    },
    {
      title: "Calendar",
      url: "#",
      icon: Calendar,
    },
    {
      title: "Search",
      url: "#",
      icon: Search,
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings,
    },
  ]

  export function Sidebar({ ctx }: RequestInfo) {
    console.log('sidebar', ctx.user)
    return (
      <SidebarComponent>
        <SidebarContent className="flex flex-col justify-between">
          <SidebarGroup>
            <SidebarGroupLabel>Application</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <a href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <div className="max-w-md flex justify-start bg-gray-200">
            {ctx.user ? (
              <>
                <div className="flex items-center p-2 pl-4 rounded">
                  <div className="overflow-hidden rounded-full w-8 h-8 mr-2">
                    <img src={ctx.user.image!} alt="" className="w-full h-full" />
                  </div>
                  <div className="flex flex-col">
                    <span className="block">{ctx.user.name}</span>
                    <span className="block">{ctx.user.email}</span>
                  </div>
                </div>
              </>
            ) : (
              <Button asChild>
                <a href="/auth/signin">Sign in</a>
              </Button>
            )}
          </div>
        </SidebarContent>
      </SidebarComponent>      
    )
  }