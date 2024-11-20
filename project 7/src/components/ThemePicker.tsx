import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Palette } from 'lucide-react';

const themes = [
  {
    name: 'Cyber Blue',
    primary: '230 100% 65%',
    secondary: '230 25% 15%',
    accent: '230 100% 65%',
  },
  {
    name: 'Neo Purple',
    primary: '270 100% 65%',
    secondary: '270 25% 15%',
    accent: '270 100% 65%',
  },
  {
    name: 'Matrix Green',
    primary: '135 100% 65%',
    secondary: '135 25% 15%',
    accent: '135 100% 65%',
  },
  {
    name: 'Crimson Edge',
    primary: '350 100% 65%',
    secondary: '350 25% 15%',
    accent: '350 100% 65%',
  },
  {
    name: 'Gold Rush',
    primary: '45 100% 65%',
    secondary: '45 25% 15%',
    accent: '45 100% 65%',
  },
  {
    name: 'Monochrome',
    primary: '0 0% 95%',
    secondary: '0 0% 15%',
    accent: '0 0% 85%',
  },
];

export function ThemePicker() {
  const setTheme = (theme: typeof themes[0]) => {
    const root = document.documentElement;
    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--secondary', theme.secondary);
    root.style.setProperty('--accent', theme.accent);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="w-10 h-10 rounded-full">
          <Palette className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {themes.map((theme) => (
          <DropdownMenuItem
            key={theme.name}
            onClick={() => setTheme(theme)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div
              className="w-4 h-4 rounded-full"
              style={{ background: `hsl(${theme.primary})` }}
            />
            {theme.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}