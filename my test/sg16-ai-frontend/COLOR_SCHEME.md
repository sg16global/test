# SG16 AI - Official Color Scheme Guide

Complete color palette and usage guide for the SG16 AI frontend matching the official logo.

## 🎨 Official Color Palette

| Color Name | Hex Code | RGB | Usage | Tailwind Class |
|---|---|---|---|---|
| **Primary Green** | `#00FF88` | rgb(0, 255, 136) | Primary buttons, logo text, main accents | `text-sg16-green`, `bg-sg16-green` |
| **Green Glow** | `#22FFAA` | rgb(34, 255, 170) | Hover states, glow effects | `bg-sg16-green-glow` |
| **Electric Cyan** | `#00E5FF` | rgb(0, 229, 255) | Links, secondary accents, labels | `text-sg16-cyan` |
| **Deep Space Black** | `#050505` | rgb(5, 5, 5) | Main background | `bg-sg16-dark` |
| **Dark Card** | `#0F0F0F` | rgb(15, 15, 15) | Cards, chat bubbles | `bg-sg16-card` |
| **Light Card** | `#1A1A1A` | rgb(26, 26, 26) | Secondary panels | `bg-sg16-card-light` |
| **White Text** | `#FFFFFF` | rgb(255, 255, 255) | Primary text | `text-white` |
| **Secondary Text** | `#B3B3B3` | rgb(179, 179, 179) | Subtitles, hints | `text-zinc-400` |
| **Border Green** | `#00FF8820` | rgba(0, 255, 136, 0.125) | Subtle borders | `border-sg16-green/10` |
| **Red Danger** | `#FF3366` | rgb(255, 51, 102) | Errors, warnings | `text-red-500` |

## 📦 Tailwind Configuration

All colors are defined in `tailwind.config.ts`:

```typescript
colors: {
  sg16: {
    green: '#00FF88',
    'green-glow': '#22FFAA',
    cyan: '#00E5FF',
    dark: '#050505',
    card: '#0F0F0F',
    'card-light': '#1A1A1A',
  },
}
```

### Shadow/Glow Effects

```typescript
boxShadow: {
  'neon-green': '0 0 25px #00FF88, 0 0 50px #00FF8844',
  'neon-cyan': '0 0 25px #00E5FF',
  'glow-green': '0 0 30px rgba(0, 255, 136, 0.6)',
}
```

## 🎯 Color Usage Rules

### Primary Button
```tsx
<button className="bg-sg16-green hover:bg-sg16-green-glow text-black font-bold py-3 rounded-2xl glow-green">
  Action
</button>
```

### Input Fields
```tsx
<input className="bg-sg16-card border-2 border-sg16-green/30 rounded-2xl px-4 py-3 focus:border-sg16-green focus:glow-green text-white" />
```

### Card/Panel
```tsx
<div className="bg-sg16-card border border-sg16-green/10 rounded-3xl p-6">
  Content
</div>
```

### Label/Title
```tsx
<label className="text-sg16-cyan font-semibold">Label Text</label>
```

### Chat Message (User)
```tsx
<div className="bg-sg16-green text-black glow-green rounded-3xl px-5 py-3 font-medium">
  User message
</div>
```

### Chat Message (Assistant)
```tsx
<div className="bg-sg16-card border-2 border-sg16-green/30 text-white rounded-3xl px-5 py-3">
  Assistant response
</div>
```

### Text with Gradient
```tsx
<h1 className="gradient-text">SG16 AI</h1>
```

### Text with Neon Glow
```tsx
<h1 className="neon-text">SG16</h1>
```

## 🌟 Special Effects

### Glow Effect Classes (in globals.css)

```css
.glow-green {
  box-shadow: 0 0 30px rgba(0, 255, 136, 0.6), 0 0 50px rgba(0, 255, 136, 0.3);
}

.glow-green-sm {
  box-shadow: 0 0 15px rgba(0, 255, 136, 0.4);
}

.glow-cyan {
  box-shadow: 0 0 25px rgba(0, 229, 255, 0.5);
}

.neon-text {
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.8), 0 0 20px rgba(0, 255, 136, 0.4);
  color: #00FF88;
}

.gradient-text {
  @apply bg-gradient-to-r from-sg16-green via-sg16-cyan to-sg16-green bg-clip-text text-transparent font-bold;
}
```

### Background Effects

```tsx
{/* Cosmic gradient background */}
<div className="bg-gradient-to-br from-sg16-dark via-[#0f0f1f] to-sg16-dark">
  Content
</div>

{/* Radial glow effect */}
<div className="bg-[radial-gradient(at_50%_50%,#00FF8820_0%,transparent_70%)]">
  Content
</div>
```

## 🎨 Component Examples

### Login Page
- Background: `bg-sg16-dark` with radial gradient
- Inputs: `bg-sg16-card` with `border-sg16-green/30`
- Button: `bg-sg16-green` with glow
- Labels: `text-sg16-cyan`

### Chat Interface
- Chat box bg: `bg-sg16-card/30`
- User bubble: `bg-sg16-green` with glow
- Assistant bubble: `bg-sg16-card` with `border-sg16-green/30`
- Input: `bg-sg16-card` with green border
- Input focus: `focus:glow-green`

### Navigation
- Sidebar bg: `bg-sg16-card/30`
- Link hover: `hover:bg-sg16-green/10`
- Active link: `border-sg16-green/30`

### Status Messages
- Success: `text-sg16-green` with `bg-sg16-green/10`
- Error: `text-red-500` with `bg-red-500/10`
- Info: `text-sg16-cyan`

## ✅ Design Checklist

When adding new components, ensure:

- [ ] Primary action buttons use `bg-sg16-green` with `glow-green`
- [ ] Input fields have `border-sg16-green/30` and focus glow
- [ ] Text labels are `text-sg16-cyan` when interactive
- [ ] Card backgrounds are `bg-sg16-card` or `bg-sg16-card-light`
- [ ] Page backgrounds are `bg-sg16-dark`
- [ ] Borders use `border-sg16-green/10` for subtlety
- [ ] All interactive elements have proper hover states
- [ ] Glow effects applied appropriately with `glow-green` or `glow-cyan`
- [ ] Gradient text used for main titles/branding

## 🔄 Consistency Rules

1. **All buttons** → Green primary, glow on hover
2. **All inputs** → Card background, green border, glow on focus
3. **All text labels** → Cyan color for interactive, white for normal
4. **All cards** → Dark background with subtle green border
5. **All titles** → Gradient text or neon glow
6. **All backgrounds** → Deep space black with cosmic gradients

## 📱 Responsive Considerations

The color scheme works perfectly on all screen sizes:
- Mobile: Glow effects are subtle, borders visible
- Tablet: Full glow effects, smooth transitions
- Desktop: Full cosmic effects with animations

## 🌙 Dark Mode Only

This color scheme is optimized for dark mode. All colors:
- Have high contrast on dark backgrounds
- Provide accessibility (WCAG AA)
- Create premium, futuristic aesthetic
- Match the SG16 logo perfectly

## 🎭 Alternative Usage

If you need to override colors for specific cases:

```tsx
// Direct hex usage
<div className="bg-[#00FF88]">Custom</div>

// CSS variables
<div style={{ color: 'var(--sg16-primary)' }}>Custom</div>

// Tailwind arbitrary values
<div className="text-[#00E5FF]">Custom</div>
```

## 📞 Support

If you need to adjust colors:

1. Update `tailwind.config.ts` for Tailwind classes
2. Update CSS variables in `app/globals.css` for CSS usage
3. Test on all screen sizes
4. Ensure contrast ratio ≥ 4.5:1 for accessibility

---

**SG16 AI Color Scheme v1.0**  
Designed to perfectly match the official SG16 AI logo.  
*Most Powerful AI Engine | Premium Dark Theme*
