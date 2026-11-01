import { useLocale } from "../context/useLocale";
import React from "react";
import clsx from "clsx";
import { getInitialsFromName } from "../utils/user";

type UserAvatarProps = {
  name: string;
  size?: "sm" | "toolbar" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "h-8 w-8 text-[11px]",
  toolbar: "h-10 w-10 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-20 w-20 text-2xl",
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  size = "md",
  className,
}) => {
  const { t } = useLocale();
  return (
    <div
      className={clsx("playful-avatar", sizeClasses[size], className)}
      aria-label={t("common.avatar.label", { name })}
      role="img"
    >
      {getInitialsFromName(name)}
    </div>
  );
};
