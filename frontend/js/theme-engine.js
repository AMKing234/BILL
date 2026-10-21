/**
 * theme-engine.js - Ultra-Advanced Theme & Layout Engine
 * Features:
 * - 105+ Curated High-Fidelity UI Themes across 7 categories
 * - Real-Time Custom Theme Creator (Infinite Color Palettes)
 * - Layout Presets: Expanded Sidebar, Mini 68px Sidebar, Topbar Navigation, Floating Island Dock
 * - Density Modes: Compact (High-Density Retail), Cozy (Default), Spacious (Touch POS)
 * - Corner Styles: Sharp (0px), Subtle (6px), Modern (12px), Pill (22px)
 * - Glassmorphism: Frosted Blur vs Solid Performance
 * - Offline WebAudio Synthesizer (Cash Register Chime, Scanner Beeps, UI Pops)
 * - Floating POS Calculator & Cash Change Calculator
 * - Instant Dynamic UPI QR Code Generator
 * - WhatsApp 1-Click Invoice Messenger
 * - Thermal POS Slip (58mm/80mm) Mode
 * - Global Keyboard Shortcuts HUD (F1-F9, ?, Esc)
 */

(function () {
    'use strict';

    // ── 1. WebAudio Synthesizer (100% Offline, Zero Assets) ──
    const AudioFX = {
        ctx: null,
        enabled: true,
        init() {
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) this.ctx = new AudioCtx();
            } catch (e) {
                console.warn('AudioContext not supported', e);
            }
        },
        getCtx() {
            if (!this.ctx) this.init();
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            return this.ctx;
        },
        // Cash Register "Ka-Ching"
        playChime() {
            if (!this.enabled) return;
            const ctx = this.getCtx();
            if (!ctx) return;
            const now = ctx.currentTime;

            // First coin bell tone (higher)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(1174.66, now); // D6
            osc1.frequency.exponentialRampToValueAtTime(1760.00, now + 0.08); // A6
            gain1.gain.setValueAtTime(0.25, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.35);

            // Second register chime ring
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(1567.98, now + 0.09); // G6
            osc2.frequency.exponentialRampToValueAtTime(2349.32, now + 0.35); // D7
            gain2.gain.setValueAtTime(0.3, now + 0.09);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.09);
            osc2.stop(now + 0.6);
        },
        // Barcode Scanner Beep
        playBeep() {
            if (!this.enabled) return;
            const ctx = this.getCtx();
            if (!ctx) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1800, now);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.09);
        },
        // Soft Click / Pop
        playClick() {
            if (!this.enabled) return;
            const ctx = this.getCtx();
            if (!ctx) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(700, now);
            osc.frequency.exponentialRampToValueAtTime(350, now + 0.04);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.04);
        }
    };

    // ── 2. Catalog of 105 Curated Themes ──
    const THEMES = [
        // Category 1: Dark & Midnight (20)
        { id: 'midnight-obsidian', name: 'Midnight Obsidian', cat: 'dark', type: 'dark', p: '#6366F1', a: '#06B6D4', bg: '#090D16', s: '#111827', t: '#F8FAFC' },
        { id: 'amoled-black', name: 'AMOLED Pitch Black', cat: 'dark', type: 'dark', p: '#3B82F6', a: '#60A5FA', bg: '#000000', s: '#0B0B0C', t: '#FFFFFF' },
        { id: 'charcoal-slate', name: 'Charcoal Slate', cat: 'dark', type: 'dark', p: '#38BDF8', a: '#818CF8', bg: '#0F172A', s: '#1E293B', t: '#F1F5F9' },
        { id: 'gunmetal-carbon', name: 'Gunmetal Carbon', cat: 'dark', type: 'dark', p: '#14B8A6', a: '#06B6D4', bg: '#121820', s: '#1B2431', t: '#F8FAFC' },
        { id: 'deep-space', name: 'Deep Space Nebula', cat: 'dark', type: 'dark', p: '#8B5CF6', a: '#EC4899', bg: '#0B0B1A', s: '#14142B', t: '#F9FAFB' },
        { id: 'eclipse-shadow', name: 'Eclipse Monochrome', cat: 'dark', type: 'dark', p: '#E2E8F0', a: '#94A3B8', bg: '#121212', s: '#1E1E1E', t: '#FFFFFF' },
        { id: 'night-owl', name: 'Night Owl Cobalt', cat: 'dark', type: 'dark', p: '#82AAFF', a: '#7FDBCA', bg: '#011627', s: '#0B253A', t: '#D6DEEB' },
        { id: 'cyber-void', name: 'Cosmic Cyber Void', cat: 'dark', type: 'dark', p: '#A855F7', a: '#3B82F6', bg: '#05050A', s: '#0E0E18', t: '#EDE9FE' },
        { id: 'titanium-dark', name: 'Titanium Industrial', cat: 'dark', type: 'dark', p: '#F59E0B', a: '#E2E8F0', bg: '#18191C', s: '#232529', t: '#F3F4F6' },
        { id: 'phantom-black', name: 'Phantom Ghost', cat: 'dark', type: 'dark', p: '#94A3B8', a: '#CBD5E1', bg: '#0C0D0E', s: '#16181B', t: '#F8FAFC' },
        { id: 'dracula-pro', name: 'Dracula Pro', cat: 'dark', type: 'dark', p: '#BD93F9', a: '#FF79C6', bg: '#282A36', s: '#343746', t: '#F8F8F2' },
        { id: 'monokai-pro', name: 'Monokai Pro', cat: 'dark', type: 'dark', p: '#FFD866', a: '#FF6188', bg: '#2D2A2E', s: '#3A373B', t: '#FCFCFA' },
        { id: 'gruvbox-dark', name: 'Gruvbox Retro Dark', cat: 'dark', type: 'dark', p: '#FABD2F', a: '#FE8019', bg: '#1D2021', s: '#282828', t: '#EBDBB2' },
        { id: 'one-dark-pro', name: 'One Dark Pro Atom', cat: 'dark', type: 'dark', p: '#61AFEF', a: '#98C379', bg: '#21252B', s: '#282C34', t: '#ABB2BF' },
        { id: 'nord-frost-dark', name: 'Nord Frost Arctic', cat: 'dark', type: 'dark', p: '#88C0D0', a: '#81A1C1', bg: '#2E3440', s: '#3B4252', t: '#ECEFF4' },
        { id: 'tokyo-night', name: 'Tokyo Night Shinjuku', cat: 'dark', type: 'dark', p: '#7AA2F7', a: '#BB9AF7', bg: '#1A1B26', s: '#24283B', t: '#C0CAF5' },
        { id: 'catppuccin-mocha', name: 'Catppuccin Mocha', cat: 'dark', type: 'dark', p: '#CBA6F7', a: '#F5C2E7', bg: '#1E1E2E', s: '#252538', t: '#CDD6F4' },
        { id: 'material-oceanic', name: 'Material Oceanic', cat: 'dark', type: 'dark', p: '#80CBC4', a: '#82AAFF', bg: '#0F111A', s: '#1A1C25', t: '#EEFFFF' },
        { id: 'synthwave-night', name: 'Synthwave Outrun', cat: 'dark', type: 'dark', p: '#FF71CE', a: '#01CDFE', bg: '#18122B', s: '#261C44', t: '#FEE5FF' },
        { id: 'black-hole-amber', name: 'Black Hole Event', cat: 'dark', type: 'dark', p: '#F59E0B', a: '#EF4444', bg: '#080705', s: '#15120E', t: '#FEF3C7' },

        // Category 2: Cyberpunk, Neon & Sci-Fi (15)
        { id: 'cyberpunk-2077', name: 'Cyberpunk 2077', cat: 'cyber', type: 'dark', p: '#FEE500', a: '#00F0FF', bg: '#0A0D14', s: '#151A24', t: '#F8FAFC' },
        { id: 'matrix-terminal', name: 'Matrix Phosphor', cat: 'cyber', type: 'dark', p: '#00FF66', a: '#00CC44', bg: '#020B05', s: '#06180B', t: '#D1FAE5' },
        { id: 'tron-legacy', name: 'Tron Neon Grid', cat: 'cyber', type: 'dark', p: '#00E5FF', a: '#2979FF', bg: '#050C15', s: '#0B182B', t: '#E0F7FA' },
        { id: 'blade-runner', name: 'Blade Runner 2049', cat: 'cyber', type: 'dark', p: '#FF6B35', a: '#00D2D3', bg: '#0D1117', s: '#161F2E', t: '#F3F4F6' },
        { id: 'quantum-blue', name: 'Quantum Core', cat: 'cyber', type: 'dark', p: '#00D4FF', a: '#7928CA', bg: '#060B1E', s: '#0C1738', t: '#E0F2FE' },
        { id: 'hologram-hud', name: 'Hologram Sci-Fi HUD', cat: 'cyber', type: 'dark', p: '#00F2FE', a: '#4FACFE', bg: '#040E1E', s: '#081E3B', t: '#E0F2FE' },
        { id: 'laser-ruby', name: 'Laser Ruby Cyber', cat: 'cyber', type: 'dark', p: '#FF0055', a: '#FF5252', bg: '#100508', s: '#1F0A10', t: '#FFE4E6' },
        { id: 'synthwave-1984', name: 'Neon Synthwave 1984', cat: 'cyber', type: 'dark', p: '#FF007F', a: '#00F5D4', bg: '#160B24', s: '#25123D', t: '#FDF2F8' },
        { id: 'retro-arcade', name: 'Retro 8-Bit Arcade', cat: 'cyber', type: 'dark', p: '#E040FB', a: '#00E5FF', bg: '#120E22', s: '#201A38', t: '#F3E8FF' },
        { id: 'ghost-shell', name: 'Ghost in the Shell', cat: 'cyber', type: 'dark', p: '#00FFA3', a: '#00B8D9', bg: '#081014', s: '#102028', t: '#E6FFFA' },
        { id: 'mech-armor', name: 'Heavy Mech Armor', cat: 'cyber', type: 'dark', p: '#FF8C00', a: '#A0AEC0', bg: '#1A1D20', s: '#262A2E', t: '#F7FAFC' },
        { id: 'hyperdrive', name: 'Hyperdrive Warp', cat: 'cyber', type: 'dark', p: '#7C4DFF', a: '#00E676', bg: '#09071A', s: '#151036', t: '#EDE7F6' },
        { id: 'plasma-core', name: 'Tokamak Plasma', cat: 'cyber', type: 'dark', p: '#FF2E93', a: '#7B2CBF', bg: '#140816', s: '#250F29', t: '#FCE7F3' },
        { id: 'cyber-emerald', name: 'Cyber Jade Matrix', cat: 'cyber', type: 'dark', p: '#00FF9D', a: '#00B4D8', bg: '#05140C', s: '#0C2417', t: '#DCFCE7' },
        { id: 'overclocked', name: 'Overclocked Flame', cat: 'cyber', type: 'dark', p: '#FF4500', a: '#FFD700', bg: '#180D0B', s: '#291613', t: '#FFEDD5' },

        // Category 3: Luxury, Royal & Executive (15)
        { id: 'imperial-gold', name: 'Imperial 24K Gold', cat: 'luxury', type: 'dark', p: '#D4AF37', a: '#F3E5AB', bg: '#0A0906', s: '#17150E', t: '#FEF9C3' },
        { id: 'royal-amethyst', name: 'Royal Crown Amethyst', cat: 'luxury', type: 'dark', p: '#9D4EDD', a: '#E0AAFF', bg: '#120A1E', s: '#201235', t: '#F3E8FF' },
        { id: 'rose-gold-luxe', name: 'Rose Gold Sovereign', cat: 'luxury', type: 'dark', p: '#E0A899', a: '#F4ACB7', bg: '#140F12', s: '#241B20', t: '#FFE4E6' },
        { id: 'emerald-dynasty', name: 'Emerald Dynasty', cat: 'luxury', type: 'dark', p: '#10B981', a: '#34D399', bg: '#06120C', s: '#0D2217', t: '#ECFDF5' },
        { id: 'ruby-crown', name: 'Ruby Monarch Crown', cat: 'luxury', type: 'dark', p: '#E63946', a: '#FFB703', bg: '#16080B', s: '#260F14', t: '#FFF1F2' },
        { id: 'sapphire-sovereign', name: 'Sapphire Sovereign', cat: 'luxury', type: 'dark', p: '#2563EB', a: '#60A5FA', bg: '#081120', s: '#0F203C', t: '#EFF6FF' },
        { id: 'platinum-elite', name: 'Brushed Platinum', cat: 'luxury', type: 'dark', p: '#CBD5E1', a: '#94A3B8', bg: '#131518', s: '#1D2126', t: '#F8FAFC' },
        { id: 'black-velvet', name: 'Black Velvet Tuxedo', cat: 'luxury', type: 'dark', p: '#E5C07B', a: '#C678DD', bg: '#09090A', s: '#141416', t: '#FDF4DC' },
        { id: 'monaco-casino', name: 'Monaco Grand Casino', cat: 'luxury', type: 'dark', p: '#DC2626', a: '#F59E0B', bg: '#120808', s: '#200E0E', t: '#FEF2F2' },
        { id: 'champagne-elegance', name: 'Champagne Ivory', cat: 'luxury', type: 'light', p: '#B45309', a: '#D97706', bg: '#FAF8F5', s: '#FFFFFF', t: '#451A03' },
        { id: 'diamond-frost', name: 'Diamond Ice Royalty', cat: 'luxury', type: 'dark', p: '#38BDF8', a: '#E0F2FE', bg: '#07101C', s: '#0E1F35', t: '#F0F9FF' },
        { id: 'cognac-leather', name: 'Cognac Whiskey Timber', cat: 'luxury', type: 'dark', p: '#D97706', a: '#FBBF24', bg: '#140D09', s: '#241810', t: '#FEF3C7' },
        { id: 'presidential-navy', name: 'Presidential Diplomat', cat: 'luxury', type: 'dark', p: '#3B82F6', a: '#F8FAFC', bg: '#081225', s: '#102140', t: '#F8FAFC' },
        { id: 'venetian-marble', name: 'Venetian Marble Carrara', cat: 'luxury', type: 'light', p: '#475569', a: '#94A3B8', bg: '#F8F9FA', s: '#FFFFFF', t: '#0F172A' },
        { id: 'sovereign-jade', name: 'Sovereign Qing Jade', cat: 'luxury', type: 'dark', p: '#059669', a: '#D4AF37', bg: '#0A1612', s: '#142922', t: '#ECFDF5' },

        // Category 4: Nature, Organic & Earth (15)
        { id: 'amazon-rainforest', name: 'Amazon Rainforest', cat: 'nature', type: 'dark', p: '#22C55E', a: '#84CC16', bg: '#08140B', s: '#102616', t: '#F0FDF4' },
        { id: 'ocean-mariana', name: 'Mariana Trench Deep', cat: 'nature', type: 'dark', p: '#0EA5E9', a: '#06B6D4', bg: '#040D1A', s: '#091B33', t: '#F0F9FF' },
        { id: 'desert-dunes', name: 'Sahara Desert Dunes', cat: 'nature', type: 'dark', p: '#F59E0B', a: '#D97706', bg: '#1C150D', s: '#2E2215', t: '#FEF3C7' },
        { id: 'sunset-horizon', name: 'Sunset Horizon Glow', cat: 'nature', type: 'dark', p: '#F43F5E', a: '#FB923C', bg: '#180B0D', s: '#2A1317', t: '#FFF1F2' },
        { id: 'nordic-pine', name: 'Nordic Forest Pine', cat: 'nature', type: 'dark', p: '#14B8A6', a: '#5EEAD4', bg: '#0C1613', s: '#162621', t: '#F0FDFA' },
        { id: 'cherry-blossom-dark', name: 'Night Sakura Blossom', cat: 'nature', type: 'dark', p: '#F472B6', a: '#FB7185', bg: '#170D14', s: '#281622', t: '#FDF2F8' },
        { id: 'autumn-maple', name: 'Autumn Maple Harvest', cat: 'nature', type: 'dark', p: '#EA580C', a: '#F97316', bg: '#190F0A', s: '#2B1A12', t: '#FFF7ED' },
        { id: 'coral-reef', name: 'Living Coral Reef', cat: 'nature', type: 'dark', p: '#14B8A6', a: '#FB7185', bg: '#091418', s: '#12242B', t: '#F0FDFA' },
        { id: 'volcanic-magma', name: 'Volcanic Basalt Magma', cat: 'nature', type: 'dark', p: '#EF4444', a: '#F97316', bg: '#140606', s: '#240C0C', t: '#FEF2F2' },
        { id: 'glacier-ice', name: 'Glacier Blue Ice', cat: 'nature', type: 'dark', p: '#06B6D4', a: '#67E8F9', bg: '#07131B', s: '#0F2432', t: '#ECFEFF' },
        { id: 'lavender-meadow', name: 'Provence Lavender', cat: 'nature', type: 'dark', p: '#A78BFA', a: '#C4B5FD', bg: '#120E1C', s: '#201A31', t: '#F5F3FF' },
        { id: 'olive-grove', name: 'Tuscan Olive Grove', cat: 'nature', type: 'dark', p: '#84CC16', a: '#A3E635', bg: '#13170E', s: '#212818', t: '#F7FEE7' },
        { id: 'bamboo-mist', name: 'Zen Bamboo Mist', cat: 'nature', type: 'dark', p: '#10B981', a: '#6EE7B7', bg: '#0A1410', s: '#13261F', t: '#ECFDF5' },
        { id: 'solar-flare', name: 'Solar Flare Helios', cat: 'nature', type: 'dark', p: '#EAB308', a: '#FACC15', bg: '#161106', s: '#271E0B', t: '#FEFCE8' },
        { id: 'canyon-rock', name: 'Grand Canyon Sandstone', cat: 'nature', type: 'dark', p: '#D97706', a: '#EA580C', bg: '#1A110D', s: '#2C1D17', t: '#FEF3C7' },

        // Category 5: Vibrant, Gradient & Pastel Pop (15)
        { id: 'instagram-sunset', name: 'Instagram Sunset Pop', cat: 'pastel', type: 'dark', p: '#E1306C', a: '#F77737', bg: '#150A1A', s: '#25122E', t: '#FDF2F8' },
        { id: 'miami-vice', name: 'Miami Vice Neon', cat: 'pastel', type: 'dark', p: '#FF4081', a: '#00E5FF', bg: '#0E1424', s: '#18223C', t: '#F8FAFC' },
        { id: 'bubblegum-sweet', name: 'Bubblegum Sweet', cat: 'pastel', type: 'dark', p: '#EC4899', a: '#A855F7', bg: '#1B0E1B', s: '#2E182E', t: '#FDF2F8' },
        { id: 'electric-citrus', name: 'Electric Citrus Burst', cat: 'pastel', type: 'dark', p: '#84CC16', a: '#EAB308', bg: '#0B1405', s: '#15260A', t: '#F7FEE7' },
        { id: 'peachy-glow', name: 'Peachy Coral Glow', cat: 'pastel', type: 'dark', p: '#FB923C', a: '#F472B6', bg: '#181110', s: '#2A1E1C', t: '#FFF7ED' },
        { id: 'mint-sorbet', name: 'Mint Sorbet Crisp', cat: 'pastel', type: 'dark', p: '#2DD4BF', a: '#5EEAD4', bg: '#081716', s: '#102927', t: '#F0FDFA' },
        { id: 'blueberry-blast', name: 'Blueberry Indigo Blast', cat: 'pastel', type: 'dark', p: '#6366F1', a: '#38BDF8', bg: '#0C1024', s: '#161C3D', t: '#EEF2FF' },
        { id: 'mango-tango', name: 'Mango Tropical Tango', cat: 'pastel', type: 'dark', p: '#F59E0B', a: '#10B981', bg: '#181206', s: '#2A1F0B', t: '#FEF3C7' },
        { id: 'cotton-candy', name: 'Cotton Candy Dream', cat: 'pastel', type: 'dark', p: '#38BDF8', a: '#F472B6', bg: '#121021', s: '#201D38', t: '#F0F9FF' },
        { id: 'electric-violet', name: 'Electric Ultra Violet', cat: 'pastel', type: 'dark', p: '#8B5CF6', a: '#C084FC', bg: '#130924', s: '#21103D', t: '#F5F3FF' },
        { id: 'tropical-lagoon', name: 'Tropical Island Lagoon', cat: 'pastel', type: 'dark', p: '#06B6D4', a: '#F59E0B', bg: '#051417', s: '#0B252B', t: '#ECFEFF' },
        { id: 'neon-matcha', name: 'Kyoto Matcha Green', cat: 'pastel', type: 'dark', p: '#65A30D', a: '#84CC16', bg: '#0F160C', s: '#1B2715', t: '#F7FEE7' },
        { id: 'vaporwave-dream', name: 'Vaporwave Twilight', cat: 'pastel', type: 'dark', p: '#D946EF', a: '#06B6D4', bg: '#150F24', s: '#241A3D', t: '#FAE8FF' },
        { id: 'twilight-boulevard', name: 'Twilight Boulevard', cat: 'pastel', type: 'dark', p: '#C026D3', a: '#FBBF24', bg: '#170B1D', s: '#271431', t: '#FDF4FF' },
        { id: 'hyper-pop', name: 'Hyper Pop Rave', cat: 'pastel', type: 'dark', p: '#F43F5E', a: '#38BDF8', bg: '#120E22', s: '#20183B', t: '#FFE4E6' },

        // Category 6: Clean, Modern Light & Office (15)
        { id: 'modern-executive', name: 'Modern Executive Indigo', cat: 'light', type: 'light', p: '#4F46E5', a: '#0284C7', bg: '#F8FAFC', s: '#FFFFFF', t: '#0F172A' },
        { id: 'apple-clean', name: 'Cupertino Clean Slate', cat: 'light', type: 'light', p: '#0071E3', a: '#5AC8FA', bg: '#F5F5F7', s: '#FFFFFF', t: '#1D1D1F' },
        { id: 'google-material', name: 'Google Material White', cat: 'light', type: 'light', p: '#1A73E8', a: '#34A853', bg: '#FFFFFF', s: '#F8F9FA', t: '#202124' },
        { id: 'paper-white', name: 'Editorial Paper White', cat: 'light', type: 'light', p: '#171717', a: '#737373', bg: '#FAFAFA', s: '#FFFFFF', t: '#0A0A0A' },
        { id: 'github-primer', name: 'GitHub Primer Modern', cat: 'light', type: 'light', p: '#0969DA', a: '#1F883D', bg: '#F6F8FA', s: '#FFFFFF', t: '#1F2328' },
        { id: 'notion-minimal', name: 'Notion Warm Minimal', cat: 'light', type: 'light', p: '#2F3437', a: '#EB5757', bg: '#F7F6F3', s: '#FFFFFF', t: '#37352F' },
        { id: 'linear-light', name: 'Linear Precision Violet', cat: 'light', type: 'light', p: '#5E6AD2', a: '#4F46E5', bg: '#F9FAFB', s: '#FFFFFF', t: '#111827' },
        { id: 'stripe-modern', name: 'Stripe Fintech Blurple', cat: 'light', type: 'light', p: '#635BFF', a: '#00D4FF', bg: '#F8FAFD', s: '#FFFFFF', t: '#0A2540' },
        { id: 'swiss-studio', name: 'Swiss International Grid', cat: 'light', type: 'light', p: '#FF3333', a: '#111111', bg: '#F4F4F6', s: '#FFFFFF', t: '#111111' },
        { id: 'warm-canvas', name: 'Warm Oat Canvas', cat: 'light', type: 'light', p: '#78350F', a: '#D97706', bg: '#FDFBF7', s: '#FFFFFF', t: '#451A03' },
        { id: 'soft-frost', name: 'Soft Arctic Frost', cat: 'light', type: 'light', p: '#0284C7', a: '#38BDF8', bg: '#F0F9FF', s: '#FFFFFF', t: '#0C4A6E' },
        { id: 'solarized-light', name: 'Solarized Light Sand', cat: 'light', type: 'light', p: '#268BD2', a: '#2AA198', bg: '#FDF6E3', s: '#EEE8D5', t: '#073642' },
        { id: 'gruvbox-light', name: 'Gruvbox Retro Cream', cat: 'light', type: 'light', p: '#B57614', a: '#AF3A03', bg: '#FBF1C7', s: '#EBDBB2', t: '#3C3836' },
        { id: 'catppuccin-latte', name: 'Catppuccin Cream Latte', cat: 'light', type: 'light', p: '#7287FD', a: '#8839EF', bg: '#EFF1F5', s: '#E6E9EF', t: '#4C4F69' },
        { id: 'nord-snow-storm', name: 'Nord Snow Storm', cat: 'light', type: 'light', p: '#5E81AC', a: '#88C0D0', bg: '#ECEFF4', s: '#E5E9F0', t: '#2E3440' },

        // Category 7: High Contrast, Accessibility & Special (10)
        { id: 'high-contrast-dark', name: 'High Contrast (WCAG Black/Yellow)', cat: 'contrast', type: 'dark', p: '#FFFF00', a: '#00FFFF', bg: '#000000', s: '#0F0F0F', t: '#FFFF00' },
        { id: 'high-contrast-light', name: 'High Contrast (WCAG White/Black)', cat: 'contrast', type: 'light', p: '#000000', a: '#0000FF', bg: '#FFFFFF', s: '#FFFFFF', t: '#000000' },
        { id: 'eye-saver-amber', name: 'Eye Saver Amber (No Blue Light)', cat: 'contrast', type: 'dark', p: '#F59E0B', a: '#FBBF24', bg: '#14100C', s: '#211B15', t: '#FEF3C7' },
        { id: 'e-paper-grayscale', name: 'E-Paper Monochrome Slate', cat: 'contrast', type: 'light', p: '#262626', a: '#525252', bg: '#E5E5E5', s: '#F5F5F5', t: '#171717' },
        { id: 'terminal-crt', name: 'Terminal Green CRT 1980', cat: 'contrast', type: 'dark', p: '#39FF14', a: '#00FF00', bg: '#051005', s: '#0A1C0A', t: '#39FF14' },
        { id: 'ultraviolet-night', name: 'Ultra Violet Haze', cat: 'contrast', type: 'dark', p: '#A855F7', a: '#E879F9', bg: '#10081C', s: '#1D0F33', t: '#F3E8FF' },
        { id: 'golden-hour-cocoa', name: 'Warm Cocoa Golden Hour', cat: 'contrast', type: 'dark', p: '#F59E0B', a: '#EA580C', bg: '#18110D', s: '#281C16', t: '#FEF3C7' },
        { id: 'industrial-steel-hazard', name: 'Industrial Hazard Orange', cat: 'contrast', type: 'dark', p: '#FF6B00', a: '#F2A900', bg: '#16191D', s: '#21262D', t: '#F8FAFC' },
        { id: 'blood-moon', name: 'Blood Moon Crimson', cat: 'contrast', type: 'dark', p: '#E11D48', a: '#FB7185', bg: '#120406', s: '#21080C', t: '#FFE4E6' },
        { id: 'custom-studio', name: 'Custom Studio Palette', cat: 'contrast', type: 'dark', p: '#6366F1', a: '#06B6D4', bg: '#090D16', s: '#111827', t: '#F8FAFC' }
    ];

    // ── 3. ThemeEngine Core Object ──
    window.ThemeEngine = {
        themes: THEMES,
        audio: AudioFX,

        // Current Config state
        config: {
            themeId: 'midnight-obsidian',
            sidebarMode: 'expanded',   // 'expanded' | 'compact' | 'topbar' | 'dock'
            density: 'cozy',           // 'compact' | 'cozy' | 'spacious'
            radius: 'modern',          // 'sharp' | 'subtle' | 'modern' | 'pill'
            glass: 'frosted',          // 'frosted' | 'solid'
            sounds: true,
            posBar: false,
            customColors: {
                primary: '#6366F1',
                accent: '#06B6D4',
                bg: '#090D16',
                surface: '#111827',
                text: '#F8FAFC'
            }
        },

        init() {
            this.loadConfig();
            this.applyAll();
            this.bindHotkeys();
            this.injectTopBarControls();
            this.audio.init();
        },

        loadConfig() {
            try {
                const saved = localStorage.getItem('theme_engine_config');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    this.config = { ...this.config, ...parsed };
                } else {
                    // Check legacy theme key
                    const legacy = localStorage.getItem('theme');
                    if (legacy === 'light') this.config.themeId = 'modern-executive';
                    else if (legacy === 'dark') this.config.themeId = 'midnight-obsidian';
                }
            } catch (e) {
                console.warn('Error reading theme config', e);
            }
            this.audio.enabled = this.config.sounds;
        },

        saveConfig() {
            try {
                localStorage.setItem('theme_engine_config', JSON.stringify(this.config));
                localStorage.setItem('theme', this.isCurrentThemeDark() ? 'dark' : 'light');
            } catch (e) {}
        },

        isCurrentThemeDark() {
            const current = this.themes.find(t => t.id === this.config.themeId);
            return current ? current.type === 'dark' : true;
        },

        applyAll() {
            this.applyTheme(this.config.themeId, false);
            this.applySidebarMode(this.config.sidebarMode, false);
            this.applyDensity(this.config.density, false);
            this.applyRadius(this.config.radius, false);
            this.applyGlass(this.config.glass, false);
            this.applyPosBar(this.config.posBar, false);
            this.saveConfig();
        },

        applyTheme(themeId, save = true) {
            this.config.themeId = themeId;
            let theme = this.themes.find(t => t.id === themeId);
            if (!theme) theme = this.themes[0];

            const root = document.documentElement;
            const isDark = theme.type === 'dark';
            root.setAttribute('data-theme', isDark ? 'dark' : 'light');
            root.setAttribute('data-active-theme', theme.id);

            // Handle Custom Theme Studio overrides
            if (themeId === 'custom-studio') {
                const c = this.config.customColors;
                root.style.setProperty('--primary-color', c.primary);
                root.style.setProperty('--primary-light', c.primary + 'CC');
                root.style.setProperty('--primary-dark', c.primary);
                root.style.setProperty('--primary-glow', `0 0 25px ${c.primary}40`);
                root.style.setProperty('--primary-gradient', `linear-gradient(135deg, ${c.primary} 0%, ${c.accent} 100%)`);
                root.style.setProperty('--accent-color', c.accent);
                root.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${c.accent} 0%, ${c.primary} 100%)`);
                root.style.setProperty('--bg-body', c.bg);
                root.style.setProperty('--bg-sidebar', c.surface);
                root.style.setProperty('--bg-surface', c.surface);
                root.style.setProperty('--bg-surface-elevated', c.surface);
                root.style.setProperty('--bg-hover', c.surface);
                root.style.setProperty('--bg-input', c.bg);
                root.style.setProperty('--text-main', c.text);
                root.style.setProperty('--border-color', isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)');
            } else {
                root.style.setProperty('--primary-color', theme.p);
                root.style.setProperty('--primary-light', theme.p + 'E6');
                root.style.setProperty('--primary-dark', theme.p);
                root.style.setProperty('--primary-glow', `0 0 25px ${theme.p}40`);
                root.style.setProperty('--primary-gradient', `linear-gradient(135deg, ${theme.p} 0%, ${theme.a} 100%)`);
                root.style.setProperty('--accent-color', theme.a);
                root.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${theme.a} 0%, ${theme.p} 100%)`);
                root.style.setProperty('--bg-body', theme.bg);
                root.style.setProperty('--bg-sidebar', theme.s);
                root.style.setProperty('--bg-surface', theme.s);
                root.style.setProperty('--bg-surface-elevated', isDark ? theme.s : '#F1F5F9');
                root.style.setProperty('--bg-hover', isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)');
                root.style.setProperty('--bg-input', theme.bg);
                root.style.setProperty('--text-main', theme.t);
                root.style.setProperty('--border-color', isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)');
                root.style.setProperty('--border-focus', theme.p);
            }

            // Sync legacy theme toggle icon
            const darkIcon = document.querySelector('.theme-toggle-btn .dark-icon');
            const lightIcon = document.querySelector('.theme-toggle-btn .light-icon');
            if (darkIcon && lightIcon) {
                if (isDark) {
                    darkIcon.classList.remove('hidden');
                    lightIcon.classList.add('hidden');
                } else {
                    darkIcon.classList.add('hidden');
                    lightIcon.classList.remove('hidden');
                }
            }

            if (save) this.saveConfig();
        },

        applySidebarMode(mode, save = true) {
            this.config.sidebarMode = mode;
            document.documentElement.setAttribute('data-sidebar', mode);
            if (save) this.saveConfig();
        },

        applyDensity(density, save = true) {
            this.config.density = density;
            document.documentElement.setAttribute('data-density', density);
            if (save) this.saveConfig();
        },

        applyRadius(radius, save = true) {
            this.config.radius = radius;
            document.documentElement.setAttribute('data-radius', radius);
            const root = document.documentElement;
            if (radius === 'sharp') {
                root.style.setProperty('--radius-sm', '0px');
                root.style.setProperty('--radius-md', '0px');
                root.style.setProperty('--radius-lg', '0px');
                root.style.setProperty('--radius-xl', '0px');
            } else if (radius === 'subtle') {
                root.style.setProperty('--radius-sm', '4px');
                root.style.setProperty('--radius-md', '6px');
                root.style.setProperty('--radius-lg', '8px');
                root.style.setProperty('--radius-xl', '10px');
            } else if (radius === 'modern') {
                root.style.setProperty('--radius-sm', '8px');
                root.style.setProperty('--radius-md', '12px');
                root.style.setProperty('--radius-lg', '16px');
                root.style.setProperty('--radius-xl', '20px');
            } else if (radius === 'pill') {
                root.style.setProperty('--radius-sm', '12px');
                root.style.setProperty('--radius-md', '18px');
                root.style.setProperty('--radius-lg', '24px');
                root.style.setProperty('--radius-xl', '30px');
            }
            if (save) this.saveConfig();
        },

        applyGlass(glass, save = true) {
            this.config.glass = glass;
            document.documentElement.setAttribute('data-glass', glass);
            const root = document.documentElement;
            if (glass === 'solid') {
                root.style.setProperty('--bg-glass', 'var(--bg-surface)');
            } else {
                root.style.setProperty('--bg-glass', this.isCurrentThemeDark() ? 'rgba(17, 24, 39, 0.85)' : 'rgba(255, 255, 255, 0.88)');
            }
            if (save) this.saveConfig();
        },

        applyPosBar(show, save = true) {
            this.config.posBar = show;
            let bar = document.getElementById('express-pos-bar');
            if (show) {
                if (!bar) {
                    bar = document.createElement('div');
                    bar.id = 'express-pos-bar';
                    bar.className = 'express-pos-bar';
                    bar.innerHTML = `
                        <div class="pos-bar-content">
                            <div class="pos-badge">⚡ EXPRESS POS</div>
                            <div class="pos-quick-actions">
                                <button class="btn btn-sm btn-primary" onclick="App.navigate('/invoices/new')">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                    New Bill (F2)
                                </button>
                                <button class="btn btn-sm btn-secondary" onclick="ThemeEngine.openChangeCalculator()">
                                    💵 Cash Change
                                </button>
                                <button class="btn btn-sm btn-secondary" onclick="ThemeEngine.openCalculator()">
                                    🧮 Calc (F9)
                                </button>
                                <button class="btn btn-sm btn-secondary" onclick="ThemeEngine.showUpiModal(0, 'QUICK-PAY', 'Cash Customer')">
                                    📱 UPI QR
                                </button>
                            </div>
                            <button class="pos-bar-close" onclick="ThemeEngine.togglePosBar()" title="Hide POS Bar">&times;</button>
                        </div>
                    `;
                    const mainArea = document.getElementById('main-area');
                    if (mainArea) {
                        mainArea.insertBefore(bar, mainArea.firstChild);
                    }
                }
                bar.classList.remove('hidden');
            } else if (bar) {
                bar.classList.add('hidden');
            }
            if (save) this.saveConfig();
        },

        togglePosBar() {
            this.applyPosBar(!this.config.posBar, true);
        },

        // ── 4. Inject TopBar Controls ──
        injectTopBarControls() {
            const topActions = document.querySelector('.top-actions');
            if (!topActions) return;

            // Check if already injected
            if (document.getElementById('btn-open-theme-studio')) return;

            // 1. Theme Studio Button
            const themeBtn = document.createElement('button');
            themeBtn.id = 'btn-open-theme-studio';
            themeBtn.className = 'btn-icon theme-studio-trigger';
            themeBtn.title = 'Themes (100+) & UI Studio (F8)';
            themeBtn.innerHTML = `🎨<span class="btn-bubble-count">105</span>`;
            themeBtn.onclick = () => {
                this.audio.playClick();
                this.openStudio();
            };

            // 2. POS Calculator Button
            const calcBtn = document.createElement('button');
            calcBtn.id = 'btn-open-calculator';
            calcBtn.className = 'btn-icon';
            calcBtn.title = 'Quick Calculator (F9)';
            calcBtn.innerHTML = `🧮`;
            calcBtn.onclick = () => {
                this.audio.playClick();
                this.openCalculator();
            };

            // 3. Shortcuts Button
            const helpBtn = document.createElement('button');
            helpBtn.id = 'btn-open-shortcuts';
            helpBtn.className = 'btn-icon';
            helpBtn.title = 'Keyboard Shortcuts (?)';
            helpBtn.innerHTML = `⌨️`;
            helpBtn.onclick = () => {
                this.audio.playClick();
                this.openShortcuts();
            };

            // 4. POS Bar toggle button
            const posToggleBtn = document.createElement('button');
            posToggleBtn.id = 'btn-toggle-pos-bar';
            posToggleBtn.className = 'btn-icon';
            posToggleBtn.title = 'Toggle Express POS Bar';
            posToggleBtn.innerHTML = `⚡`;
            posToggleBtn.onclick = () => {
                this.audio.playClick();
                this.togglePosBar();
            };

            // Insert before theme toggle button
            const themeToggle = document.getElementById('theme-toggle');
            if (themeToggle) {
                topActions.insertBefore(posToggleBtn, themeToggle);
                topActions.insertBefore(calcBtn, themeToggle);
                topActions.insertBefore(themeBtn, themeToggle);
                topActions.insertBefore(helpBtn, themeToggle);
            }
        },

        // ── 5. Keyboard Hotkeys ──
        bindHotkeys() {
            window.addEventListener('keydown', (e) => {
                // If user is actively typing in an input/textarea, ignore single-key hotkeys
                const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);

                if (e.key === 'F2') {
                    e.preventDefault();
                    this.audio.playClick();
                    App.navigate('/invoices/new');
                } else if (e.key === 'F3' && !isInput) {
                    e.preventDefault();
                    this.audio.playClick();
                    App.navigate('/products');
                } else if (e.key === 'F4' && !isInput) {
                    e.preventDefault();
                    this.audio.playClick();
                    App.navigate('/customers');
                } else if (e.key === 'F8') {
                    e.preventDefault();
                    this.audio.playClick();
                    this.openStudio();
                } else if (e.key === 'F9') {
                    e.preventDefault();
                    this.audio.playClick();
                    this.openCalculator();
                } else if (e.key === '?' && !isInput) {
                    e.preventDefault();
                    this.audio.playClick();
                    this.openShortcuts();
                } else if (e.key === 'Escape') {
                    App.closeModal();
                }
            });
        },

        // ── 6. UI & Theme Studio Modal ──
        openStudio() {
            const cur = this.config;
            const total = this.themes.length;

            const modalHtml = `
                <div class="theme-studio-modal">
                    <div class="studio-header">
                        <div class="studio-title-group">
                            <span class="studio-badge">V3.0 HYPER-ENGINE</span>
                            <h2>🎨 UI, Themes & Layout Studio</h2>
                            <p>Select from <strong>${total}+ Curated Themes</strong> or design your own bespoke palette in real-time.</p>
                        </div>
                        <button class="btn-icon modal-close-btn" onclick="App.closeModal()">&times;</button>
                    </div>

                    <div class="studio-nav-tabs">
                        <button class="studio-tab active" data-tab="themes" onclick="ThemeEngine.switchStudioTab('themes')">🎨 105+ Themes</button>
                        <button class="studio-tab" data-tab="layout" onclick="ThemeEngine.switchStudioTab('layout')">📐 Layout & Density</button>
                        <button class="studio-tab" data-tab="custom" onclick="ThemeEngine.switchStudioTab('custom')">✨ Custom Palette Studio</button>
                    </div>

                    <!-- TAB 1: 105+ Themes -->
                    <div id="studio-tab-themes" class="studio-tab-pane active">
                        <div class="studio-toolbar">
                            <div class="studio-search-wrapper">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                <input type="text" id="theme-search-input" placeholder="Search 105+ themes (e.g. matrix, gold, cyber, nord, velvet)..." oninput="ThemeEngine.filterThemes()">
                            </div>
                            <div class="studio-category-pills">
                                <button class="cat-pill active" data-cat="all" onclick="ThemeEngine.filterCat('all')">All (${total})</button>
                                <button class="cat-pill" data-cat="dark" onclick="ThemeEngine.filterCat('dark')">🌑 Dark & Midnight (20)</button>
                                <button class="cat-pill" data-cat="cyber" onclick="ThemeEngine.filterCat('cyber')">⚡ Cyber & Sci-Fi (15)</button>
                                <button class="cat-pill" data-cat="luxury" onclick="ThemeEngine.filterCat('luxury')">👑 Luxury & Gold (15)</button>
                                <button class="cat-pill" data-cat="nature" onclick="ThemeEngine.filterCat('nature')">🌿 Nature & Earth (15)</button>
                                <button class="cat-pill" data-cat="pastel" onclick="ThemeEngine.filterCat('pastel')">🎨 Pastel & Pop (15)</button>
                                <button class="cat-pill" data-cat="light" onclick="ThemeEngine.filterCat('light')">☀️ Clean Light (15)</button>
                                <button class="cat-pill" data-cat="contrast" onclick="ThemeEngine.filterCat('contrast')">👁️ High Contrast (10)</button>
                            </div>
                        </div>

                        <div class="theme-grid-container" id="theme-grid">
                            ${this.renderThemeCards(this.themes)}
                        </div>
                    </div>

                    <!-- TAB 2: Layout, Density & Sound -->
                    <div id="studio-tab-layout" class="studio-tab-pane">
                        <div class="layout-controls-grid">
                            <!-- Sidebar Style -->
                            <div class="layout-card">
                                <h3>Navigation Architecture</h3>
                                <p class="layout-card-sub">Choose your primary navigation layout</p>
                                <div class="option-button-group">
                                    <button class="opt-btn ${cur.sidebarMode === 'expanded' ? 'active' : ''}" onclick="ThemeEngine.selectSidebar('expanded')">
                                        <span class="opt-icon">📑</span>
                                        <strong>Full Sidebar</strong>
                                        <small>260px with labels</small>
                                    </button>
                                    <button class="opt-btn ${cur.sidebarMode === 'compact' ? 'active' : ''}" onclick="ThemeEngine.selectSidebar('compact')">
                                        <span class="opt-icon">📌</span>
                                        <strong>Mini Sidebar</strong>
                                        <small>68px icon bar</small>
                                    </button>
                                    <button class="opt-btn ${cur.sidebarMode === 'topbar' ? 'active' : ''}" onclick="ThemeEngine.selectSidebar('topbar')">
                                        <span class="opt-icon">🧭</span>
                                        <strong>Top Navigation</strong>
                                        <small>Horizontal navbar</small>
                                    </button>
                                </div>
                            </div>

                            <!-- Display Density -->
                            <div class="layout-card">
                                <h3>Information Density</h3>
                                <p class="layout-card-sub">Adjust table and row spacing for retail</p>
                                <div class="option-button-group">
                                    <button class="opt-btn ${cur.density === 'compact' ? 'active' : ''}" onclick="ThemeEngine.selectDensity('compact')">
                                        <span class="opt-icon">⚡</span>
                                        <strong>High Density</strong>
                                        <small>Compact tables (POS)</small>
                                    </button>
                                    <button class="opt-btn ${cur.density === 'cozy' ? 'active' : ''}" onclick="ThemeEngine.selectDensity('cozy')">
                                        <span class="opt-icon">☕</span>
                                        <strong>Cozy Balanced</strong>
                                        <small>Standard SaaS look</small>
                                    </button>
                                    <button class="opt-btn ${cur.density === 'spacious' ? 'active' : ''}" onclick="ThemeEngine.selectDensity('spacious')">
                                        <span class="opt-icon">📱</span>
                                        <strong>Touch POS</strong>
                                        <small>Large touch targets</small>
                                    </button>
                                </div>
                            </div>

                            <!-- Corner Geometry -->
                            <div class="layout-card">
                                <h3>Corner Geometry</h3>
                                <p class="layout-card-sub">Shape of cards, buttons, and inputs</p>
                                <div class="option-button-group">
                                    <button class="opt-btn ${cur.radius === 'sharp' ? 'active' : ''}" onclick="ThemeEngine.selectRadius('sharp')">
                                        <span class="opt-icon">⬛</span>
                                        <strong>Sharp 0px</strong>
                                        <small>Industrial Brutalist</small>
                                    </button>
                                    <button class="opt-btn ${cur.radius === 'subtle' ? 'active' : ''}" onclick="ThemeEngine.selectRadius('subtle')">
                                        <span class="opt-icon">◽</span>
                                        <strong>Subtle 6px</strong>
                                        <small>Classic Enterprise</small>
                                    </button>
                                    <button class="opt-btn ${cur.radius === 'modern' ? 'active' : ''}" onclick="ThemeEngine.selectRadius('modern')">
                                        <span class="opt-icon">◻️</span>
                                        <strong>Modern 12px</strong>
                                        <small>Contemporary Soft</small>
                                    </button>
                                    <button class="opt-btn ${cur.radius === 'pill' ? 'active' : ''}" onclick="ThemeEngine.selectRadius('pill')">
                                        <span class="opt-icon">⭕</span>
                                        <strong>Pill 22px</strong>
                                        <small>Fluid Organic</small>
                                    </button>
                                </div>
                            </div>

                            <!-- Glassmorphism & Audio -->
                            <div class="layout-card">
                                <h3>Atmosphere & Sensory</h3>
                                <p class="layout-card-sub">Sound effects and frosted glass blur</p>
                                <div class="toggle-row">
                                    <div>
                                        <strong>Glassmorphism Blur</strong>
                                        <small>Frosted acrylic glass effect</small>
                                    </div>
                                    <button class="btn btn-sm ${cur.glass === 'frosted' ? 'btn-primary' : 'btn-secondary'}" onclick="ThemeEngine.toggleGlass()">
                                        ${cur.glass === 'frosted' ? '✨ Frosted Glass' : '⬜ Flat Solid'}
                                    </button>
                                </div>
                                <div class="toggle-row" style="margin-top: 15px;">
                                    <div>
                                        <strong>POS Audio Sound Effects</strong>
                                        <small>Ka-Ching cash chime & scan beeps</small>
                                    </div>
                                    <button class="btn btn-sm ${cur.sounds ? 'btn-success' : 'btn-secondary'}" onclick="ThemeEngine.toggleSounds()">
                                        ${cur.sounds ? '🔊 Audio ON' : '🔇 Muted'}
                                    </button>
                                </div>
                                <div style="margin-top: 10px; display:flex; gap:10px;">
                                    <button class="btn btn-sm btn-secondary" onclick="ThemeEngine.audio.playChime()">🔔 Test Cash Chime</button>
                                    <button class="btn btn-sm btn-secondary" onclick="ThemeEngine.audio.playBeep()">📡 Test Scanner Beep</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- TAB 3: Custom Theme Studio -->
                    <div id="studio-tab-custom" class="studio-tab-pane">
                        <div class="custom-studio-layout">
                            <div class="custom-pickers-card">
                                <h3>Design Your Bespoke Theme</h3>
                                <p>Select custom colors for each layer of your workspace:</p>
                                
                                <div class="color-picker-group">
                                    <div class="color-picker-item">
                                        <label>Primary Brand Accent</label>
                                        <div class="picker-input-wrap">
                                            <input type="color" id="custom-p" value="${cur.customColors.primary}" onchange="ThemeEngine.updateCustomPreview()">
                                            <input type="text" id="custom-p-hex" value="${cur.customColors.primary}" onchange="ThemeEngine.syncHexColor('p', this.value)">
                                        </div>
                                    </div>
                                    <div class="color-picker-item">
                                        <label>Secondary Glow Accent</label>
                                        <div class="picker-input-wrap">
                                            <input type="color" id="custom-a" value="${cur.customColors.accent}" onchange="ThemeEngine.updateCustomPreview()">
                                            <input type="text" id="custom-a-hex" value="${cur.customColors.accent}" onchange="ThemeEngine.syncHexColor('a', this.value)">
                                        </div>
                                    </div>
                                    <div class="color-picker-item">
                                        <label>Background Canvas</label>
                                        <div class="picker-input-wrap">
                                            <input type="color" id="custom-bg" value="${cur.customColors.bg}" onchange="ThemeEngine.updateCustomPreview()">
                                            <input type="text" id="custom-bg-hex" value="${cur.customColors.bg}" onchange="ThemeEngine.syncHexColor('bg', this.value)">
                                        </div>
                                    </div>
                                    <div class="color-picker-item">
                                        <label>Surface / Card Fill</label>
                                        <div class="picker-input-wrap">
                                            <input type="color" id="custom-s" value="${cur.customColors.surface}" onchange="ThemeEngine.updateCustomPreview()">
                                            <input type="text" id="custom-s-hex" value="${cur.customColors.surface}" onchange="ThemeEngine.syncHexColor('s', this.value)">
                                        </div>
                                    </div>
                                    <div class="color-picker-item">
                                        <label>Text Main Color</label>
                                        <div class="picker-input-wrap">
                                            <input type="color" id="custom-t" value="${cur.customColors.text}" onchange="ThemeEngine.updateCustomPreview()">
                                            <input type="text" id="custom-t-hex" value="${cur.customColors.text}" onchange="ThemeEngine.syncHexColor('t', this.value)">
                                        </div>
                                    </div>
                                </div>

                                <div style="margin-top: 25px; display: flex; gap: 12px;">
                                    <button class="btn btn-primary btn-lg" onclick="ThemeEngine.applyCustomTheme()">
                                        🚀 Apply Custom Theme Now
                                    </button>
                                    <button class="btn btn-secondary btn-lg" onclick="ThemeEngine.resetCustomTheme()">
                                        ↺ Reset Defaults
                                    </button>
                                </div>
                            </div>

                            <!-- Live Preview Card -->
                            <div class="custom-preview-card" id="custom-preview-box">
                                <div class="preview-mini-header">
                                    <span class="preview-badge">LIVE PREVIEW</span>
                                    <h4>BHAI BHAI COMMUNICATION</h4>
                                </div>
                                <div class="preview-stat-grid">
                                    <div class="preview-stat">
                                        <small>Today's Sales</small>
                                        <strong>₹ 48,920</strong>
                                    </div>
                                    <div class="preview-stat">
                                        <small>Invoices</small>
                                        <strong>28</strong>
                                    </div>
                                </div>
                                <div class="preview-buttons">
                                    <button class="btn btn-primary btn-sm">Primary Button</button>
                                    <button class="btn btn-secondary btn-sm">Secondary</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            App.showModal(modalHtml);
        },

        renderThemeCards(themesList) {
            const activeId = this.config.themeId;
            return themesList.map(t => {
                const isActive = t.id === activeId;
                return `
                    <div class="theme-card ${isActive ? 'active' : ''}" data-theme-id="${t.id}" data-cat="${t.cat}" onclick="ThemeEngine.selectTheme('${t.id}')">
                        <div class="theme-preview-strip" style="background: ${t.bg};">
                            <span class="preview-dot" style="background: ${t.p};" title="Primary: ${t.p}"></span>
                            <span class="preview-dot" style="background: ${t.a};" title="Accent: ${t.a}"></span>
                            <span class="preview-dot" style="background: ${t.s}; border: 1px solid rgba(255,255,255,0.2);" title="Surface: ${t.s}"></span>
                            <span class="preview-dot" style="background: ${t.t};" title="Text: ${t.t}"></span>
                        </div>
                        <div class="theme-card-info">
                            <div class="theme-card-title">
                                <strong>${t.name}</strong>
                                ${isActive ? '<span class="active-badge">✓ ACTIVE</span>' : ''}
                            </div>
                            <span class="theme-cat-tag">${t.cat.toUpperCase()} &bull; ${t.type.toUpperCase()}</span>
                        </div>
                    </div>
                `;
            }).join('');
        },

        selectTheme(themeId) {
            this.audio.playClick();
            this.applyTheme(themeId, true);
            // Re-render theme grid to update active status
            const grid = document.getElementById('theme-grid');
            if (grid) {
                grid.innerHTML = this.renderThemeCards(this.themes);
            }
            App.toast(`Theme set to: ${themeId.replace(/-/g, ' ').toUpperCase()}`, 'success', 2000);
        },

        selectSidebar(mode) {
            this.audio.playClick();
            this.applySidebarMode(mode, true);
            this.updateActiveButton('.layout-card:nth-child(1) .opt-btn', mode);
            App.toast(`Navigation layout: ${mode.toUpperCase()}`, 'info', 2000);
        },

        selectDensity(density) {
            this.audio.playClick();
            this.applyDensity(density, true);
            this.updateActiveButton('.layout-card:nth-child(2) .opt-btn', density);
            App.toast(`Information density: ${density.toUpperCase()}`, 'info', 2000);
        },

        selectRadius(radius) {
            this.audio.playClick();
            this.applyRadius(radius, true);
            this.updateActiveButton('.layout-card:nth-child(3) .opt-btn', radius);
            App.toast(`Corner geometry: ${radius.toUpperCase()}`, 'info', 2000);
        },

        toggleGlass() {
            this.audio.playClick();
            const newGlass = this.config.glass === 'frosted' ? 'solid' : 'frosted';
            this.applyGlass(newGlass, true);
            this.openStudio(); // Refresh UI
            App.toast(`Glassmorphism: ${newGlass.toUpperCase()}`, 'info', 2000);
        },

        toggleSounds() {
            this.config.sounds = !this.config.sounds;
            this.audio.enabled = this.config.sounds;
            this.saveConfig();
            if (this.config.sounds) this.audio.playChime();
            this.openStudio();
            App.toast(`Sound FX: ${this.config.sounds ? 'ENABLED' : 'MUTED'}`, 'info', 2000);
        },

        updateActiveButton(selector, value) {
            document.querySelectorAll(selector).forEach(btn => {
                const text = btn.textContent.toLowerCase();
                btn.classList.toggle('active', text.includes(value));
            });
        },

        switchStudioTab(tab) {
            this.audio.playClick();
            document.querySelectorAll('.studio-tab').forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-tab') === tab);
            });
            document.querySelectorAll('.studio-tab-pane').forEach(p => {
                p.classList.toggle('active', p.id === `studio-tab-${tab}`);
            });
            if (tab === 'custom') {
                this.updateCustomPreview();
            }
        },

        filterCat(cat) {
            this.audio.playClick();
            document.querySelectorAll('.cat-pill').forEach(p => {
                p.classList.toggle('active', p.getAttribute('data-cat') === cat);
            });
            const search = (document.getElementById('theme-search-input')?.value || '').toLowerCase().trim();
            const filtered = this.themes.filter(t => {
                const matchCat = cat === 'all' || t.cat === cat;
                const matchSearch = !search || t.name.toLowerCase().includes(search) || t.id.includes(search);
                return matchCat && matchSearch;
            });
            const grid = document.getElementById('theme-grid');
            if (grid) grid.innerHTML = this.renderThemeCards(filtered);
        },

        filterThemes() {
            const search = (document.getElementById('theme-search-input')?.value || '').toLowerCase().trim();
            const activeCat = document.querySelector('.cat-pill.active')?.getAttribute('data-cat') || 'all';
            const filtered = this.themes.filter(t => {
                const matchCat = activeCat === 'all' || t.cat === activeCat;
                const matchSearch = !search || t.name.toLowerCase().includes(search) || t.id.includes(search);
                return matchCat && matchSearch;
            });
            const grid = document.getElementById('theme-grid');
            if (grid) grid.innerHTML = this.renderThemeCards(filtered);
        },

        // Custom Palette Studio
        updateCustomPreview() {
            const p = document.getElementById('custom-p')?.value || '#6366F1';
            const a = document.getElementById('custom-a')?.value || '#06B6D4';
            const bg = document.getElementById('custom-bg')?.value || '#090D16';
            const s = document.getElementById('custom-s')?.value || '#111827';
            const t = document.getElementById('custom-t')?.value || '#F8FAFC';

            document.getElementById('custom-p-hex').value = p;
            document.getElementById('custom-a-hex').value = a;
            document.getElementById('custom-bg-hex').value = bg;
            document.getElementById('custom-s-hex').value = s;
            document.getElementById('custom-t-hex').value = t;

            const box = document.getElementById('custom-preview-box');
            if (box) {
                box.style.backgroundColor = s;
                box.style.color = t;
                box.style.borderColor = p;
                const pBtn = box.querySelector('.btn-primary');
                if (pBtn) {
                    pBtn.style.backgroundColor = p;
                    pBtn.style.color = '#FFFFFF';
                }
            }
        },

        syncHexColor(field, hex) {
            if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                const el = document.getElementById(`custom-${field}`);
                if (el) el.value = hex;
                this.updateCustomPreview();
            }
        },

        applyCustomTheme() {
            this.audio.playChime();
            const c = {
                primary: document.getElementById('custom-p').value,
                accent: document.getElementById('custom-a').value,
                bg: document.getElementById('custom-bg').value,
                surface: document.getElementById('custom-s').value,
                text: document.getElementById('custom-t').value
            };
            this.config.customColors = c;
            this.applyTheme('custom-studio', true);
            App.closeModal();
            App.toast('✨ Bespoke Custom Theme Applied & Saved!', 'success', 3000);
        },

        resetCustomTheme() {
            document.getElementById('custom-p').value = '#6366F1';
            document.getElementById('custom-a').value = '#06B6D4';
            document.getElementById('custom-bg').value = '#090D16';
            document.getElementById('custom-s').value = '#111827';
            document.getElementById('custom-t').value = '#F8FAFC';
            this.updateCustomPreview();
        },

        // ── 7. Floating POS Calculator ──
        openCalculator() {
            const html = `
                <div class="pos-calculator-modal">
                    <div class="calc-header">
                        <span>🧮 POS Cashier Calculator</span>
                        <button class="calc-close" onclick="App.closeModal()">&times;</button>
                    </div>
                    <div class="calc-display-wrapper">
                        <div class="calc-history" id="calc-history">0</div>
                        <input type="text" id="calc-screen" class="calc-screen" value="0" readonly>
                    </div>
                    <div class="calc-keypad">
                        <button class="calc-btn fn" onclick="ThemeEngine.calcAction('C')">C</button>
                        <button class="calc-btn fn" onclick="ThemeEngine.calcAction('CE')">CE</button>
                        <button class="calc-btn fn" onclick="ThemeEngine.calcAction('%')">%</button>
                        <button class="calc-btn op" onclick="ThemeEngine.calcAction('/')">&divide;</button>

                        <button class="calc-btn" onclick="ThemeEngine.calcNum('7')">7</button>
                        <button class="calc-btn" onclick="ThemeEngine.calcNum('8')">8</button>
                        <button class="calc-btn" onclick="ThemeEngine.calcNum('9')">9</button>
                        <button class="calc-btn op" onclick="ThemeEngine.calcAction('*')">&times;</button>

                        <button class="calc-btn" onclick="ThemeEngine.calcNum('4')">4</button>
                        <button class="calc-btn" onclick="ThemeEngine.calcNum('5')">5</button>
                        <button class="calc-btn" onclick="ThemeEngine.calcNum('6')">6</button>
                        <button class="calc-btn op" onclick="ThemeEngine.calcAction('-')">&minus;</button>

                        <button class="calc-btn" onclick="ThemeEngine.calcNum('1')">1</button>
                        <button class="calc-btn" onclick="ThemeEngine.calcNum('2')">2</button>
                        <button class="calc-btn" onclick="ThemeEngine.calcNum('3')">3</button>
                        <button class="calc-btn op" onclick="ThemeEngine.calcAction('+')">+</button>

                        <button class="calc-btn" onclick="ThemeEngine.calcNum('0')">0</button>
                        <button class="calc-btn" onclick="ThemeEngine.calcNum('00')">00</button>
                        <button class="calc-btn" onclick="ThemeEngine.calcNum('.')">.</button>
                        <button class="calc-btn eq" onclick="ThemeEngine.calcAction('=')">=</button>
                    </div>
                    <div class="calc-footer">
                        <button class="btn btn-sm btn-secondary btn-block" onclick="ThemeEngine.copyCalcResult()">📋 Copy Result to Clipboard</button>
                    </div>
                </div>
            `;
            App.showModal(html);
        },

        calcExpression: '',
        calcNum(num) {
            this.audio.playClick();
            const screen = document.getElementById('calc-screen');
            if (!screen) return;
            if (screen.value === '0' && num !== '.') {
                screen.value = num;
            } else {
                screen.value += num;
            }
        },

        calcAction(action) {
            this.audio.playClick();
            const screen = document.getElementById('calc-screen');
            const history = document.getElementById('calc-history');
            if (!screen) return;

            if (action === 'C') {
                screen.value = '0';
                if (history) history.textContent = '0';
                this.calcExpression = '';
            } else if (action === 'CE') {
                screen.value = '0';
            } else if (['+', '-', '*', '/'].includes(action)) {
                this.calcExpression = screen.value + ' ' + action + ' ';
                if (history) history.textContent = this.calcExpression;
                screen.value = '0';
            } else if (action === '%') {
                const val = parseFloat(screen.value) || 0;
                screen.value = (val / 100).toString();
            } else if (action === '=') {
                try {
                    const full = this.calcExpression + screen.value;
                    const res = Function(`"use strict"; return (${full})`)();
                    if (history) history.textContent = full + ' =';
                    screen.value = parseFloat(res.toFixed(4)).toString();
                    this.calcExpression = '';
                    this.audio.playChime();
                } catch (e) {
                    screen.value = 'Error';
                }
            }
        },

        copyCalcResult() {
            const screen = document.getElementById('calc-screen');
            if (screen && screen.value) {
                navigator.clipboard.writeText(screen.value);
                App.toast(`Copied ₹ ${screen.value} to clipboard!`, 'success');
            }
        },

        // ── 8. Cash Change Calculator ──
        openChangeCalculator() {
            const html = `
                <div class="change-calc-modal">
                    <div class="modal-header">
                        <h3>💵 Cash Change & Tender Calculator</h3>
                        <button class="btn-icon" onclick="App.closeModal()">&times;</button>
                    </div>
                    <div class="modal-body" style="padding: 20px;">
                        <div class="form-group">
                            <label class="form-label">Total Bill Amount (₹)</label>
                            <input type="number" id="change-bill-amt" class="form-input" style="font-size: 1.3em; font-weight: 700;" placeholder="Enter bill amount" oninput="ThemeEngine.computeChange()">
                        </div>

                        <div class="form-group">
                            <label class="form-label">Cash Received From Customer (₹)</label>
                            <input type="number" id="change-tendered-amt" class="form-input" style="font-size: 1.3em; font-weight: 700;" placeholder="Enter received cash" oninput="ThemeEngine.computeChange()">
                        </div>

                        <div class="quick-cash-chips" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px;">
                            <button class="btn btn-sm btn-secondary" onclick="ThemeEngine.setTender(50)">₹50</button>
                            <button class="btn btn-sm btn-secondary" onclick="ThemeEngine.setTender(100)">₹100</button>
                            <button class="btn btn-sm btn-secondary" onclick="ThemeEngine.setTender(200)">₹200</button>
                            <button class="btn btn-sm btn-secondary" onclick="ThemeEngine.setTender(500)">₹500</button>
                            <button class="btn btn-sm btn-secondary" onclick="ThemeEngine.setTender(1000)">₹1000</button>
                            <button class="btn btn-sm btn-secondary" onclick="ThemeEngine.setTender(2000)">₹2000</button>
                        </div>

                        <div class="change-result-box" style="background: var(--bg-body); padding: 20px; border-radius: 12px; text-align: center; border: 2px dashed var(--primary-color);">
                            <div style="font-size: 0.9em; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);">Change to Return</div>
                            <div id="change-due-display" style="font-size: 2.4em; font-weight: 800; color: #10B981; font-family: var(--font-mono); margin: 6px 0;">₹ 0.00</div>
                            <div id="change-status-note" style="font-size: 0.85em; color: var(--text-muted);">Awaiting amount...</div>
                        </div>
                    </div>
                </div>
            `;
            App.showModal(html);
        },

        setTender(amt) {
            const el = document.getElementById('change-tendered-amt');
            if (el) {
                el.value = amt;
                this.computeChange();
            }
        },

        computeChange() {
            const bill = parseFloat(document.getElementById('change-bill-amt')?.value) || 0;
            const tendered = parseFloat(document.getElementById('change-tendered-amt')?.value) || 0;
            const display = document.getElementById('change-due-display');
            const note = document.getElementById('change-status-note');
            if (!display || !note) return;

            if (bill === 0 && tendered === 0) {
                display.textContent = '₹ 0.00';
                display.style.color = '#10B981';
                note.textContent = 'Enter amounts above';
                return;
            }

            const diff = tendered - bill;
            if (diff >= 0) {
                display.textContent = `₹ ${diff.toFixed(2)}`;
                display.style.color = '#10B981';
                note.textContent = `Give ₹ ${diff.toFixed(2)} return change to customer`;
            } else {
                display.textContent = `Due ₹ ${Math.abs(diff).toFixed(2)}`;
                display.style.color = '#EF4444';
                note.textContent = `Customer still owes ₹ ${Math.abs(diff).toFixed(2)}`;
            }
        },

        // ── 9. Dynamic UPI QR Code Modal ──
        showUpiModal(amount = 0, invNumber = 'BILL', customerName = 'Customer') {
            // Pull dynamic UPI config from Settings (backed by backend + localStorage)
            const cfg = (window.Settings && Settings.getUpiConfig) ? Settings.getUpiConfig() : {};
            const upiId = cfg.upi_id || 'yourname@upi';
            const payeeName = cfg.payee_name || 'Your Business';
            const qrSize = cfg.qr_size || 220;
            const currency = cfg.currency || 'INR';
            const txnNote = cfg.note ? (cfg.note + ' ' + invNumber) : ('Invoice ' + invNumber);

            if (!cfg.upi_id) {
                // Show a helpful prompt to configure UPI first
                const setupHtml = `
                    <div style="text-align: center; padding: 30px;">
                        <div style="font-size: 48px; margin-bottom: 12px;">⚡</div>
                        <h3 style="font-family: var(--font-display); margin: 0 0 8px 0;">UPI Not Configured</h3>
                        <p style="color: var(--text-muted); margin: 0 0 20px 0;">Set up your UPI ID in Settings → UPI tab to enable payment QR codes.</p>
                        <div style="display: flex; gap: 10px; justify-content: center;">
                            <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
                            <button class="btn btn-primary" onclick="App.closeModal(); App.navigate('/settings/upi');">⚙️ Go to UPI Settings</button>
                        </div>
                    </div>
                `;
                App.showModal(setupHtml);
                return;
            }

            const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amount > 0 ? amount.toFixed(2) : ''}&cu=${currency}&tn=${encodeURIComponent(txnNote)}`;
            const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(upiUrl)}`;

            const html = `
                <div class="upi-qr-modal" style="text-align: center; padding: 25px;">
                    <div class="upi-brand-header" style="margin-bottom: 15px;">
                        <h3 style="margin: 0; font-family: var(--font-display);">⚡ Instant UPI Payment</h3>
                        <p style="color: var(--text-muted); font-size: 0.9em;">Scan with PhonePe, Google Pay, Paytm, or BHIM</p>
                    </div>

                    <div class="qr-frame" style="background: #FFFFFF; padding: 15px; border-radius: 16px; display: inline-block; box-shadow: var(--shadow-lg); margin: 10px 0;">
                        <img src="${qrApiUrl}" alt="UPI QR Code" style="width: ${Math.min(qrSize, 250)}px; height: ${Math.min(qrSize, 250)}px; display: block;" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'220\\' height=\\'220\\'><rect width=\\'220\\' height=\\'220\\' fill=\\'%23eee\\'/><text x=\\'50%\\' y=\\'50%\\' text-anchor=\\'middle\\' fill=\\'%23333\\'>QR Unavailable</text></svg>'">
                    </div>

                    <div class="upi-meta" style="margin-top: 15px;">
                        <div style="font-size: 1.4em; font-weight: 800; font-family: var(--font-mono); color: var(--primary-color);">
                            ₹ ${amount > 0 ? amount.toFixed(2) : 'Open Amount'}
                        </div>
                        <div style="font-size: 0.9em; color: var(--text-secondary); margin-top: 4px;">
                            Payee: <strong>${payeeName}</strong> (${upiId})
                        </div>
                        <div style="font-size: 0.85em; color: var(--text-muted); margin-top: 2px;">
                            Ref: #${invNumber} &bull; For: ${customerName}
                        </div>
                    </div>

                    <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                        <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
                        <button class="btn btn-primary" onclick="ThemeEngine.copyUpiLink('${upiUrl.replace(/'/g, "\\'")}')">📋 Copy UPI Link</button>
                        <button class="btn btn-secondary" onclick="App.navigate('/settings/upi'); App.closeModal();">⚙️ UPI Settings</button>
                    </div>
                </div>
            `;
            App.showModal(html);
        },

        copyUpiLink(url) {
            navigator.clipboard.writeText(url);
            App.toast('UPI Payment Link copied to clipboard!', 'success');
        },

        // ── 10. Keyboard Shortcuts HUD Modal ──
        openShortcuts() {
            const html = `
                <div class="shortcuts-hud-modal">
                    <div class="modal-header">
                        <h3>⌨️ Power User POS Hotkeys & Shortcuts</h3>
                        <button class="btn-icon" onclick="App.closeModal()">&times;</button>
                    </div>
                    <div class="modal-body" style="padding: 20px;">
                        <div class="shortcuts-grid">
                            <div class="shortcut-item">
                                <kbd>F2</kbd>
                                <span>Create New Bill / Express Invoice</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>F3</kbd>
                                <span>Search & Manage Products Catalog</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>F4</kbd>
                                <span>Customers Directory & Udari Due</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>F8</kbd>
                                <span>Open 105+ Themes & UI Studio</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>F9</kbd>
                                <span>Open Floating Cashier Calculator</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>?</kbd>
                                <span>Open This Shortcuts Cheat Sheet</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>Esc</kbd>
                                <span>Close Current Modal or Drawer</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            App.showModal(html);
        }
    };

    // Auto-initialize once DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.ThemeEngine.init());
    } else {
        window.ThemeEngine.init();
    }

})();
