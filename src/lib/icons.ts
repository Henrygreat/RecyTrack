/**
 * Icon Registry for Server/Client Component Boundaries
 *
 * This module provides a type-safe way to pass icon references from Server Components
 * to Client Components without triggering Next.js serialization errors.
 *
 * Usage:
 * - Server Component: Pass iconName="package" (string)
 * - Client Component: Use getIcon("package") to resolve the actual component
 */

import {
  // Core UI icons
  Package,
  MapPin,
  Shield,
  Award,
  Truck,
  Calendar,
  CheckCircle,
  Clock,
  Users,
  Box,
  Boxes,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  Bell,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ArrowRight,
  Search,
  Menu,
  X,
  Plus,
  Minus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Download,
  Upload,
  RefreshCw,
  RotateCcw,
  Copy,
  Check,
  Info,
  Archive,
  Activity,
  // Dashboard/Business icons
  LayoutDashboard,
  LayoutGrid,
  BarChart3,
  PieChart,
  LineChart,
  FileText,
  ClipboardList,
  ClipboardCheck,
  Clipboard,
  Warehouse,
  Building2,
  // Asset/Processing icons
  QrCode,
  Barcode,
  ScanLine,
  Cog,
  Recycle,
  Leaf,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Key,
  HardDrive,
  Monitor,
  Laptop,
  Server,
  Smartphone,
  MapPinned,
  // User/Admin icons
  User,
  UserCog,
  UserPlus,
  UserMinus,
  UserCheck,
  // Document icons
  FileCheck,
  FilePlus,
  FileX,
  Folder,
  FolderOpen,
  // Financial icons
  Wallet,
  Receipt,
  CreditCard,
  PiggyBank,
  PoundSterling,
  // Status icons
  CheckCircle2,
  XCircle,
  MinusCircle,
  CircleDot,
  // Navigation/Flow icons
  GitBranch,
  Route,
  Navigation,
  Compass,
  // Communication icons
  Mail,
  Phone,
  MessageSquare,
  // Time icons
  CalendarDays,
  CalendarClock,
  Timer,
  History,
  // Misc icons
  Star,
  Heart,
  Flag,
  Bookmark,
  Tag,
  Hash,
  Link as LinkIcon,
  ExternalLink,
  Paperclip,
  Image,
  Camera,
  Printer,
  Scale,
  type LucideIcon,
} from "lucide-react";

/**
 * Icon name type - union of all available icon names
 */
export type IconName =
  | "package"
  | "map-pin"
  | "shield"
  | "award"
  | "truck"
  | "calendar"
  | "check-circle"
  | "clock"
  | "users"
  | "box"
  | "boxes"
  | "trending-up"
  | "alert-circle"
  | "alert-triangle"
  | "bell"
  | "settings"
  | "help-circle"
  | "log-out"
  | "chevron-right"
  | "chevron-left"
  | "chevron-down"
  | "arrow-right"
  | "search"
  | "menu"
  | "x"
  | "plus"
  | "minus"
  | "edit"
  | "trash-2"
  | "eye"
  | "eye-off"
  | "download"
  | "upload"
  | "refresh-cw"
  | "rotate-ccw"
  | "copy"
  | "check"
  | "info"
  | "archive"
  | "activity"
  | "layout-dashboard"
  | "layout-grid"
  | "bar-chart-3"
  | "pie-chart"
  | "line-chart"
  | "file-text"
  | "clipboard-list"
  | "clipboard-check"
  | "clipboard"
  | "warehouse"
  | "building-2"
  | "qr-code"
  | "barcode"
  | "scan-line"
  | "cog"
  | "recycle"
  | "leaf"
  | "shield-check"
  | "shield-alert"
  | "lock"
  | "unlock"
  | "key"
  | "hard-drive"
  | "monitor"
  | "laptop"
  | "server"
  | "smartphone"
  | "map-pinned"
  | "user"
  | "user-cog"
  | "user-plus"
  | "user-minus"
  | "user-check"
  | "file-check"
  | "file-plus"
  | "file-x"
  | "folder"
  | "folder-open"
  | "wallet"
  | "receipt"
  | "credit-card"
  | "piggy-bank"
  | "pound-sterling"
  | "check-circle-2"
  | "x-circle"
  | "minus-circle"
  | "circle-dot"
  | "git-branch"
  | "route"
  | "navigation"
  | "compass"
  | "mail"
  | "phone"
  | "message-square"
  | "calendar-days"
  | "calendar-clock"
  | "timer"
  | "history"
  | "star"
  | "heart"
  | "flag"
  | "bookmark"
  | "tag"
  | "hash"
  | "link"
  | "external-link"
  | "paperclip"
  | "image"
  | "camera"
  | "printer"
  | "scale";

/**
 * Icon registry mapping string names to Lucide icon components
 */
const iconRegistry: Record<IconName, LucideIcon> = {
  package: Package,
  "map-pin": MapPin,
  shield: Shield,
  award: Award,
  truck: Truck,
  calendar: Calendar,
  "check-circle": CheckCircle,
  clock: Clock,
  users: Users,
  box: Box,
  boxes: Boxes,
  "trending-up": TrendingUp,
  "alert-circle": AlertCircle,
  "alert-triangle": AlertTriangle,
  bell: Bell,
  settings: Settings,
  "help-circle": HelpCircle,
  "log-out": LogOut,
  "chevron-right": ChevronRight,
  "chevron-left": ChevronLeft,
  "chevron-down": ChevronDown,
  "arrow-right": ArrowRight,
  search: Search,
  menu: Menu,
  x: X,
  plus: Plus,
  minus: Minus,
  edit: Edit,
  "trash-2": Trash2,
  eye: Eye,
  "eye-off": EyeOff,
  download: Download,
  upload: Upload,
  "refresh-cw": RefreshCw,
  "rotate-ccw": RotateCcw,
  copy: Copy,
  check: Check,
  info: Info,
  archive: Archive,
  activity: Activity,
  "layout-dashboard": LayoutDashboard,
  "layout-grid": LayoutGrid,
  "bar-chart-3": BarChart3,
  "pie-chart": PieChart,
  "line-chart": LineChart,
  "file-text": FileText,
  "clipboard-list": ClipboardList,
  "clipboard-check": ClipboardCheck,
  clipboard: Clipboard,
  warehouse: Warehouse,
  "building-2": Building2,
  "qr-code": QrCode,
  barcode: Barcode,
  "scan-line": ScanLine,
  cog: Cog,
  recycle: Recycle,
  leaf: Leaf,
  "shield-check": ShieldCheck,
  "shield-alert": ShieldAlert,
  lock: Lock,
  unlock: Unlock,
  key: Key,
  "hard-drive": HardDrive,
  monitor: Monitor,
  laptop: Laptop,
  server: Server,
  smartphone: Smartphone,
  "map-pinned": MapPinned,
  user: User,
  "user-cog": UserCog,
  "user-plus": UserPlus,
  "user-minus": UserMinus,
  "user-check": UserCheck,
  "file-check": FileCheck,
  "file-plus": FilePlus,
  "file-x": FileX,
  folder: Folder,
  "folder-open": FolderOpen,
  wallet: Wallet,
  receipt: Receipt,
  "credit-card": CreditCard,
  "piggy-bank": PiggyBank,
  "pound-sterling": PoundSterling,
  "check-circle-2": CheckCircle2,
  "x-circle": XCircle,
  "minus-circle": MinusCircle,
  "circle-dot": CircleDot,
  "git-branch": GitBranch,
  route: Route,
  navigation: Navigation,
  compass: Compass,
  mail: Mail,
  phone: Phone,
  "message-square": MessageSquare,
  "calendar-days": CalendarDays,
  "calendar-clock": CalendarClock,
  timer: Timer,
  history: History,
  star: Star,
  heart: Heart,
  flag: Flag,
  bookmark: Bookmark,
  tag: Tag,
  hash: Hash,
  link: LinkIcon,
  "external-link": ExternalLink,
  paperclip: Paperclip,
  image: Image,
  camera: Camera,
  printer: Printer,
  scale: Scale,
};

/**
 * Get a Lucide icon component by name
 * For use in Client Components to resolve icons passed from Server Components
 */
export function getIcon(name: IconName): LucideIcon {
  return iconRegistry[name];
}

/**
 * Check if a string is a valid icon name
 */
export function isValidIconName(name: string): name is IconName {
  return name in iconRegistry;
}

// Re-export LucideIcon type for convenience
export type { LucideIcon };
