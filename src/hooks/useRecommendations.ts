"use client";

import { useState, useEffect, useMemo } from "react";
import useAxios from "@/useAxios";

export interface RecommendationItem {
  id: string;
  type: "part" | "sticker" | "powdercoat";
  name: string;
  slug: string;
  price: number;
  images?: string | string[] | null;
  totalWithItem?: number;
  data: {
    id: string;
    price: string;
    images?: string[];
    translations?: Array<{
      language: string;
      title: string;
      description?: string;
    }>;
    generalPrice?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
}

export interface RecommendationsResponse {
  neededAmount: number;
  targetAmount: number;
  currentAmount: number;
  message?: string;
  recommendations: RecommendationItem[];
  totalWithItems?: number;
}

interface UseRecommendationsProps {
  costAmount: number;
  itemsIdInCart: string[];
  enabled?: boolean;
}

export const useRecommendations = ({
  costAmount,
  itemsIdInCart,
  enabled = true,
}: UseRecommendationsProps) => {
  const axiosInstance = useAxios();
  const [recommendations, setRecommendations] =
    useState<RecommendationsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize the items string for stable dependency
  const itemsString = useMemo(() => itemsIdInCart.join(","), [itemsIdInCart]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!enabled || costAmount >= 100) {
        setRecommendations(null);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await axiosInstance.post<RecommendationsResponse>(
          "/cart/recommendations",
          {
            costAmount,
            itemsIdInCart,
          }
        );

        setRecommendations(response.data);
      } catch (err) {
        console.error("Error fetching recommendations:", err);
        setError("Failed to load recommendations");
        setRecommendations(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [costAmount, itemsString, enabled]);

  return { recommendations, isLoading, error };
};
