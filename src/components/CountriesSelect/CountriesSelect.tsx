import Select, { type MultiValue } from "react-select";
import { api } from "~/trpc/react";
import { type RouterOutputs } from "~/trpc/shared";

type Language = RouterOutputs["languages"]["getLanguages"][number];
type Option = { label: string; value: string };

export const MultiCountriesSelect = ({
  value,
  onChange,
  className,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
}) => {
  const { data, isLoading } = api.languages.getLanguages.useQuery();
  const languagesSelectOptions: Option[] | undefined = data?.map((lang: Language) => ({
    label: lang.name,
    value: lang.id,
  }));

  return (
    <Select<Option, true>
      options={languagesSelectOptions}
      value={languagesSelectOptions?.filter((option: Option) =>
        value.includes(option.value),
      )}
      onChange={(newValue: MultiValue<Option>) =>
        onChange(newValue.map((val) => val.value))
      }
      isSearchable
      isMulti
      isLoading={isLoading}
      className={className}
    />
  );
};
