import { Crown, Sparkles, Star } from "lucide-react";

interface MarqueeProps {
  items: string[];
  speed?: number;
}

export function Marquee({ items, speed = 20 }: MarqueeProps) {
  const duplicatedItems = [...items, ...items];

  return (
    <div className="w-full overflow-hidden bg-card/50 border-y border-primary/20 py-3">
      <div
        className="flex whitespace-nowrap"
        style={{
          animation: `marquee ${speed}s linear infinite`,
        }}
      >
        {duplicatedItems.map((item, index) => (
          <div key={index} className="flex items-center gap-4 mx-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-gradient-gold">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PremiumMarquee() {
  const items = [
    "Premium Ajans Platformu",
    "VIP Etkinlikler",
    "Canlı PK Yayınları",
    "Özel Sohbet Grupları",
    "7/24 Destek",
    "Elit Topluluk",
    "Güvenli Platform",
    "Hızlı Etkileşim",
  ];

  return (
    <div className="w-full overflow-hidden bg-gradient-to-r from-background via-card to-background border-y border-primary/30 py-4">
      <div className="marquee-container">
        <div className="marquee-content flex items-center">
          {[...items, ...items].map((item, index) => (
            <div key={index} className="flex items-center gap-3 mx-8">
              {index % 3 === 0 && <Crown className="w-4 h-4 text-primary" />}
              {index % 3 === 1 && <Star className="w-4 h-4 text-primary" />}
              {index % 3 === 2 && <Sparkles className="w-4 h-4 text-primary" />}
              <span className="text-sm font-semibold tracking-wide text-gradient-gold uppercase">
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
