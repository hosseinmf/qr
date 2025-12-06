import { api } from "~/trpc/react";

export const checkIfSubscribed = (status?: string) => {
  return (
    status === "paid" ||
    status === "active" ||
    status === "pending"
  );
};

export const useUserSubscription = () => {
  const { data, isLoading } = api.payments.getSubscriptionInfo.useQuery();
  const status = data?.status;
  const isSubscribed = checkIfSubscribed(status);

  return {
    subscriptionData: data,
    isSubscriptionLoading: isLoading,
    isSubscribed,
  };
};
