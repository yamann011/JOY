# Design Guidelines: Premium Agency/Event Chat Platform

## Design Approach
**Reference-Based + Custom Premium**: Drawing from elite platforms like Discord (community structure), Telegram (clean chat UX), and Behance (creative showcase), adapted for a luxurious Turkish agency/event context with explicit black-gold premium aesthetic.

---

## Core Design Principles
1. **Premium Minimalism**: Elite simplicity with strategic gold accents
2. **Role-Based Hierarchy**: Visual clarity for USER > VIP > MOD > ADMIN levels
3. **Responsive Precision**: Perfect viewport fit, zero overflow
4. **Performance First**: No heavy frameworks, pure PHP efficiency

---

## Typography System

**Primary Font**: Montserrat (Google Fonts) - Modern, geometric, premium feel
- Headlines: 700 weight
- Body: 400-500 weight
- UI Elements: 600 weight

**Secondary Font**: Inter (Google Fonts) - Clean readability for chat/content
- Chat messages: 400 weight
- Labels/metadata: 500 weight

**Hierarchy**:
- Hero Title: text-5xl md:text-6xl font-bold
- Section Headers: text-3xl md:text-4xl font-bold
- Card Titles: text-xl md:text-2xl font-semibold
- Body Text: text-base md:text-lg
- Small Text/Meta: text-sm

---

## Layout System

**Spacing Scale**: Tailwind units 2, 4, 6, 8, 12, 16
- Component padding: p-4, p-6, p-8
- Section spacing: py-12, py-16
- Card gaps: gap-4, gap-6
- Element margins: m-2, m-4, mb-8

**Grid Structure**:
- Container: max-w-7xl mx-auto px-4
- Desktop PK Cards: grid-cols-3
- Tablet: grid-cols-2
- Mobile: grid-cols-1

---

## Color Palette (User-Specified)

**Primary**: Black (#000000, #0a0a0a for subtle variations)
**Accent**: Gold (#FFD700, #C5A572 for muted tones)
**Backgrounds**: 
- Main: Pure black or very dark gray (#0a0a0a)
- Cards: Slightly lighter black (#1a1a1a, #242424)
**Text**:
- Primary: White (#ffffff)
- Secondary: Light gray (#cccccc, #999999)
- Gold for premium elements/role badges

**Role Colors**:
- ADMIN: Bright gold (#FFD700)
- MOD: Medium gold (#DAA520)
- VIP: Rose gold (#B76E79)
- USER: Silver (#C0C0C0)

---

## Component Library

### Navigation
**Hamburger Menu** (Top-left):
- Fixed position overlay: z-50
- Slide-in from left: w-64 on desktop, w-full on mobile
- Black background with gold border-r
- Menu items: py-3 px-6, hover:bg-gold/10
- Role-specific items show/hide based on permissions
- Icons from Heroicons (outline style)

### Hero Section (Homepage - Logged Out)
- Full viewport height: min-h-screen
- Background: Gradient black with subtle gold shimmer overlay
- Centered content: flex flex-col items-center justify-center
- Marquee/slider at bottom: Scrolling gold text showcasing features
- CTA buttons: Black with gold border, hover fills gold

### User Notification Card (Logged In)
- Slide-in from top-right: animate-slide-in-right
- Profile image: rounded-full, w-12 h-12, gold border-2
- Name + Role badge: Horizontal layout, role badge with corresponding color
- Level indicator: Gold progress bar (placeholder for now)
- Auto-dismiss after 4 seconds with fade-out

### PK/Event Cards
- Background: #1a1a1a with gold border-l-4
- Grid layout: 3 columns desktop, 2 tablet, 1 mobile
- Agency logo: w-16 h-16 rounded, top-left
- Title: Gold text, font-bold
- Participant count: Small badge, gold background
- Participant names: Scrollable list, text-sm
- DateTime: Bottom-right, text-xs text-gray-400

### Chat Interface Structure
- Split layout: 70% chat / 30% user list
- Message bubbles: 
  - Own messages: Right-aligned, gold background
  - Others: Left-aligned, dark gray background
  - Username above each, role color-coded
- Input box: Fixed bottom, black with gold focus ring
- Send button: Gold background, black text

### Admin Dashboard
- Card-based metrics: 4 columns on desktop
- Each card: Black background, gold top border
- Icon + number + label vertical stack
- Hover: Subtle gold glow effect

---

## Images

**Hero Background**: 
- Abstract luxury pattern (gold geometric shapes on black)
- Subtle, not distracting
- Overlay with dark gradient for text readability
- Placement: Full background, fixed or parallax scroll

**Agency Logos** (PK Cards):
- Circular thumbnails
- Gold border if event is live
- Placeholder: Simple gold initials on black

**Profile Images**:
- Always circular
- Gold border thickness indicates role level
- Default avatar: Gold silhouette on black

---

## Responsive Breakpoints
- Mobile: < 768px (single column, full-width menu)
- Tablet: 768px - 1024px (2 columns, sidebar menu)
- Desktop: > 1024px (3+ columns, persistent sidebar option)

---

## Animations (Minimal, Premium)
- Menu slide: 300ms ease-in-out
- Notification entrance: Slide + fade 400ms
- Button hover: Subtle gold glow 200ms
- Card hover: Lift with shadow 250ms
- NO auto-playing carousels or distracting effects

---

## Accessibility
- Gold text on black: Ensure AAA contrast (use lighter gold #FFE55C for small text)
- Focus indicators: 2px gold outline
- Keyboard navigation: Full support for menu and forms
- Screen reader labels: All icons and interactive elements

---

## Mobile Considerations
- Touch targets: Minimum 44px height
- Hamburger menu: Full-screen overlay on mobile
- PK cards: Stack vertically with swipe gestures
- Chat: Input fixed at bottom, 20% screen height max