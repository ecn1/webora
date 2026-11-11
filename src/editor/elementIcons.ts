import {
  AlignLeft,
  AppWindow,
  CheckSquare,
  ChevronsRight,
  CircleDot,
  ClipboardList,
  Code2,
  Columns3,
  Gauge,
  Heading1,
  Image,
  Images,
  LayoutGrid,
  Link2,
  ListCollapse,
  LayoutList,
  Mail,
  Minus,
  MousePointerClick,
  MoveVertical,
  PanelBottom,
  PanelTop,
  Palette,
  SlidersHorizontal,
  Square,
  Star,
  Box,
  Send,
  TextCursorInput,
  Type,
  Video,
  WrapText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ElementType } from '../types';
import { ELEMENT_LIBRARY } from '../lib/docEngine';

export const ELEMENT_ICONS: Record<ElementType, LucideIcon> = {
  section: Square,
  container: Box,
  flex: Columns3,
  grid: LayoutGrid,
  columns: Columns3,
  card: Square,
  heading: Heading1,
  paragraph: AlignLeft,
  text: Type,
  button: MousePointerClick,
  link: Link2,
  divider: Minus,
  spacer: MoveVertical,
  image: Image,
  video: Video,
  icon: Star,
  gallery: Images,
  navbar: PanelTop,
  footer: PanelBottom,
  breadcrumbs: ChevronsRight,
  input: TextCursorInput,
  emailInput: Mail,
  textarea: WrapText,
  checkbox: CheckSquare,
  radio: CircleDot,
  select: LayoutList,
  submit: Send,
  accordion: ListCollapse,
  tabs: LayoutList,
  modal: AppWindow,
  slider: SlidersHorizontal,
  progress: Gauge,
  form: ClipboardList,
  mail: Mail,
  customHtml: Code2,
  customCss: Palette,
};

export function elementIcon(type: ElementType): LucideIcon {
  return ELEMENT_ICONS[type] ?? Square;
}

export function elementLabel(type: ElementType): string {
  return ELEMENT_LIBRARY.find((item) => item.type === type)?.label ?? type;
}
