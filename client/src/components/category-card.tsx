import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import type { DrillCategory } from "@shared/schema";

interface CategoryCardProps {
  category: DrillCategory;
  title: string;
  description: string;
  drillCount: number;
  icon: React.ReactNode;
  color: string;
}

export function CategoryCard({ 
  category, 
  title, 
  description, 
  drillCount, 
  icon,
  color 
}: CategoryCardProps) {
  return (
    <Link href={`/drills?category=${category}`}>
      <Card 
        className="group hover-elevate cursor-pointer transition-all duration-300 h-full"
        data-testid={`card-category-${category}`}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${color}20` }}
            >
              <div style={{ color }}>{icon}</div>
            </div>
            <Badge variant="secondary" className="text-xs">
              {drillCount} drills
            </Badge>
          </div>
          <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors" data-testid={`text-category-title-${category}`}>
            {title}
          </h3>
          <p className="text-sm text-muted-foreground mb-4" data-testid={`text-category-desc-${category}`}>
            {description}
          </p>
          <div className="flex items-center gap-1 text-sm text-primary font-medium">
            Browse drills
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
