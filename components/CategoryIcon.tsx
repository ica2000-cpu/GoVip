import { 
    Music, Calendar, Users, Globe, Star, Crown, Settings, Filter, Activity, 
    Layers, Utensils, Car, Ship, Anchor, Camera, Ticket, ShoppingBag, 
    Dumbbell, Coffee, Wine, Layout, Home, Tag 
} from 'lucide-react';

interface CategoryIconProps {
    iconName?: string;
    className?: string;
}

export default function CategoryIcon({ iconName, className = "w-4 h-4" }: CategoryIconProps) {
    if (!iconName) return <Tag className={className} />;
    
    // Check if URL
    if (iconName.startsWith('http')) {
        return <img src={iconName} alt="" className={`${className} object-contain rounded-sm`} />;
    }

    // Map common names to components
    const iconMap: Record<string, any> = {
        music: Music,
        calendar: Calendar,
        user: Users,
        users: Users,
        globe: Globe,
        star: Star,
        crown: Crown,
        settings: Settings,
        filter: Filter,
        activity: Activity,
        layers: Layers,
        utensils: Utensils,
        car: Car,
        ship: Ship,
        anchor: Anchor,
        camera: Camera,
        ticket: Ticket,
        shopping: ShoppingBag,
        dumbbell: Dumbbell,
        coffee: Coffee,
        wine: Wine,
        layout: Layout,
        home: Home
    };

    const LowerName = iconName.toLowerCase().trim();
    const IconComponent = iconMap[LowerName];

    if (IconComponent) {
        return <IconComponent className={className} />;
    }

    // Assume Emoji or other text
    return <span className={`${className} flex items-center justify-center not-italic leading-none`}>{iconName}</span>;
}