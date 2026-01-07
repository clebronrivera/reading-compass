import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Database,
  FileText,
  FolderOpen,
  FileBox,
  LayoutList,
  Calculator,
  BookOpen,
  ChevronDown,
} from 'lucide-react';
import { COMPONENT_INFO } from '@/types/registry';
import { getComponentDotClass, COMPONENT_CODES, type ComponentCode } from '@/lib/componentColors';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const libraryItems = [
  { title: 'Assessment Registry', url: '/registry', icon: Database },
  { title: 'ASR Library', url: '/asr', icon: FileText },
  { title: 'Content Banks', url: '/banks', icon: FolderOpen },
  { title: 'Forms', url: '/forms', icon: FileBox },
  { title: 'Items', url: '/items', icon: LayoutList },
  { title: 'Scoring Outputs', url: '/scoring', icon: Calculator },
];

export function AppSidebar() {
  const location = useLocation();
  const [componentsOpen, setComponentsOpen] = useState(true);
  const [librariesOpen, setLibrariesOpen] = useState(true);

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sidebar-primary/20">
            <BookOpen className="h-6 w-6 text-sidebar-primary" />
          </div>
          <div>
            <h1 className="font-bold text-sidebar-foreground text-lg leading-tight">Reading</h1>
            <p className="text-xs text-sidebar-foreground/70">Assessment Registry</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Dashboard */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink
                  to="/"
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
                    isActive('/') 
                      ? 'bg-sidebar-accent text-sidebar-primary font-medium' 
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  )}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Component Areas */}
        <Collapsible open={componentsOpen} onOpenChange={setComponentsOpen}>
          <SidebarGroup>
            <CollapsibleTrigger className="w-full">
              <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:text-sidebar-foreground">
                <span>Component Areas</span>
                <ChevronDown className={cn('h-4 w-4 transition-transform', componentsOpen && 'rotate-180')} />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {COMPONENT_CODES.map((code) => (
                    <SidebarMenuItem key={code}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={`/component/${code}`}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
                            isActive(`/component/${code}`)
                              ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                              : 'text-sidebar-foreground hover:bg-sidebar-accent'
                          )}
                        >
                          <span className={cn('h-3 w-3 rounded-full', getComponentDotClass(code))} />
                          <span className="text-sm">{COMPONENT_INFO[code].name}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Libraries */}
        <Collapsible open={librariesOpen} onOpenChange={setLibrariesOpen}>
          <SidebarGroup>
            <CollapsibleTrigger className="w-full">
              <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:text-sidebar-foreground">
                <span>Libraries</span>
                <ChevronDown className={cn('h-4 w-4 transition-transform', librariesOpen && 'rotate-180')} />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {libraryItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
                            isActive(item.url)
                              ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                              : 'text-sidebar-foreground hover:bg-sidebar-accent'
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                          <span className="text-sm">{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="text-xs text-sidebar-foreground/60">
          <p>23 Assessments</p>
          <p>6 Libraries</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
