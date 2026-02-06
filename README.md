<div align="center">

# 🎯 Slidev Converter

### Convert Markdown to Slidev Presentations with AI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Slidev](https://img.shields.io/badge/Slidev-v52.11+-blue.svg)](https://sli.dev)

**[🌐 简体中文](README_zh.md)**

</div>

---

## 📖 About

**Slidev Converter** is a Claude Skill that transforms standard Markdown documents into beautiful [Slidev](https://sli.dev) presentations. It automatically handles slide separation, layout selection, and syntax conversion with comprehensive support for advanced Slidev features.

### ✨ Features

| Feature | Description |
|---------|-------------|
| 🔄 **Auto Conversion** | Transform Markdown to Slidev format instantly |
| 📐 **Smart Layouts** | Automatically selects appropriate layouts (12+ built-in) |
| 🎨 **Syntax Support** | Full Slidev syntax including animations, components, and directives |
| 📚 **Complete Reference** | Built-in comprehensive syntax reference covering all features |
| 📄 **Template Included** | Ready-to-use presentation template |
| 🚀 **Advanced Features** | LaTeX math, Mermaid diagrams, Vue components, export options |
| 🎭 **Animations** | v-click, v-after, v-motion, v-mark directives |
| 🎨 **UnoCSS Support** | Complete utility class reference for styling |

---

## 🚀 Quick Start

### Installation

1. Clone or download this skill
2. Import to Claude Code or copy to your skills directory

### Usage

Simply ask Claude to convert your Markdown:

```
"Convert this markdown to Slidev format: [your content]"
```

```
"Turn my notes into a Slidev presentation"
```

```
"Create slides from this markdown: [paste content]"
```

---

## 📋 Supported Features

### Core Features
- ✅ Slide separation with `---` syntax
- ✅ Frontmatter configurations (global and per-slide)
- ✅ 12+ built-in layouts (center, two-cols, image-left/right, iframe, etc.)
- ✅ Code blocks with syntax highlighting and line highlighting
- ✅ UnoCSS utility classes for styling

### Animations
- ✅ `v-click` - Click-based animations
- ✅ `v-after` - Sequential animations
- ✅ `v-clicks` - List animations
- ✅ `v-mark` - Text marking (underline, circle)
- ✅ `v-motion` - Motion animations with presets
- ✅ Slide transitions (slide-left, fade, etc.)

### Components
- ✅ Toc (Table of Contents)
- ✅ Link with preview cards
- ✅ YouTube embeds
- ✅ Tweet embeds
- ✅ Custom Vue components

### Advanced
- ✅ LaTeX math (inline and block)
- ✅ Mermaid diagrams (flowchart, sequence, class, state, ER, journey)
- ✅ Speaker notes
- ✅ Export options (PDF, PPTX, PNG)
- ✅ Global context ($slidev)
- ✅ Monaco editor integration

---

## 🎨 Layout Guide

| Content Type | Recommended Layout |
|:-------------:|:------------------:|
| 📄 Title/Cover | `layout: cover` or `layout: center` |
| 📝 Text + Code | `layout: two-cols` |
| 🖼️ Text + Image | `layout: image-right` or `layout: image-left` |
| 📊 Bullet Points | Default (no layout) |
| ⚖️ Comparison | `layout: two-cols` with `::right::` |
| 🌐 Website Demo | `layout: iframe` |
| 💬 Quote | `layout: quote` |

---

## 📚 Syntax Quick Reference

### Page Separation

```markdown
---
---

# Slide Title

Content

---
---

# Next Slide
```

### Frontmatter

```markdown
---
layout: two-cols
class: text-center
theme: seriph
transition: slide-left
---

# Content
```

### Click Animations

```markdown
<div v-click>Appears on click</div>

<v-clicks>
- Item 1
- Item 2
- Item 3
</v-clicks>
```

### Two Columns

```markdown
---
layout: two-cols
---

## Left Column

- Point A
- Point B

::right::

## Right Column

Description or code
```

### LaTeX Math

```markdown
Inline: $E = mc^2$

Block:
$$
\int_{0}^{\infty} e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
$$
```

---

## 📂 Skill Structure

```
slidev-converter/
├── SKILL.md                    # Core instructions for Claude
├── README.md                   # This file (English)
├── README_zh.md                # Chinese version
├── references/
│   └── slidev-syntax.md       # Complete syntax reference (600+ lines)
└── assets/
    └── template.md            # Starter template
```

---

## 🔗 Resources

- [Slidev Official Documentation](https://sli.dev/guide/)
- [Slidev Syntax Guide](https://sli.dev/guide/syntax.html)
- [Layout Reference](https://sli.dev/guide/layouts.html)
- [Theme Gallery](https://sli.dev/resources/theme-gallery)
- [Built-in Components](https://sli.dev/guide/built-ins.html)

---

## 📝 License

MIT License - feel free to use and modify!

---

<div align="center">

**Made with ❤️ for the Slidev community**

**[🌐 简体中文](README_zh.md)**

</div>
