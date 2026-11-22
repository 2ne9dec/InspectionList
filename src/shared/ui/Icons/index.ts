/**
 * Публичный набор иконок.
 *
 * Общие UI-иконки — из lucide-react (установленная библиотека, SVG-компоненты,
 * попадают в бандл и работают офлайн). Доменные иконки (опора ЛЭП, офлайн-статус,
 * точка, шеврон с поворотом) остаются локальными.
 *
 * Не используем <img>, внешние URL и PNG-иконки.
 */
export type { IconProps } from './_base';

// ── Общие UI-иконки (lucide-react) ──────────────────────────────────────────
export {
  X             as IconClose,
  TriangleAlert as IconWarning,
  Trash2         as IconTrash,
  Save           as IconSave,
  ListChecks     as IconTasks,
  Check          as IconCheck,
  Pencil         as IconEdit,
  Download       as IconDownload,
  Eye            as IconEye,
  EyeOff         as IconEyeOff,
  Search         as IconSearch,
  FileText       as IconSheet,
  LogOut         as IconLogout,
  ClipboardList  as IconClipboard,
  User           as IconUser,
  Home            as IconHome,
  Map             as IconMap,
  Upload          as IconUpload,
  Camera          as IconCamera,
  Lock            as IconLock,
  ChartBar        as IconChart,
  MapPin          as IconPin,
  Wrench          as IconWrench,
  Globe           as IconGlobe,
  Link            as IconLink,
  Plus            as IconPlus,
  Maximize        as IconFullscreen,
  Minimize        as IconExitFullscreen,
  UploadCloud     as IconUploadProgress,
  Calendar        as IconCalendar,
  Moon            as IconMoon,
  Sun             as IconSun,
  Settings        as IconSettings,
} from 'lucide-react';

// ── Доменные иконки ─────────────────────────────────────────────────────────
export { IconAI }      from './IconAI';
export { IconChevron } from './IconChevron';
export { IconDot }     from './IconDot';
export { IconOffline } from './IconOffline';
export { IconTower }   from './IconTower';
