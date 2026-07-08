import { useState } from "react";

export function useModal<T>() {
  const [value, setValue] = useState<T | null>(null);

  return {
    value,
    open: setValue,
    close: () => setValue(null),
    setValue
  };
}
