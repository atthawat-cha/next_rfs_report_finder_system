import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import {
  MenuType,
  PermissionTemplateType,
  RolePermissionsType,
} from "@/lib/types";
import { perConvertToCheckbox } from "@/lib/user-management";

export default function PermissionsFormCheckbox({
  params,
  template,
}: {
  params: RolePermissionsType;
  template: PermissionTemplateType[];
}) {
  if (!template) return null;

  const converted = perConvertToCheckbox(template)
  console.log(converted)
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(
    new Set(["1"])
  )
  const selectAll = selectedRows.size === converted.length
  
  const itemChecked = (id:string) =>{
    return converted.includes(id)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(converted.map((id) => id)))
    } else {
      setSelectedRows(new Set())
    }
  }
  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedRows)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedRows(newSelected)
  }


  return (
    <FieldSet>
      <div className="flex item-center justify-between my-2 gap-5">
        <div className="flex flex-col w-full justify-start">
            <FieldLegend variant="label">
            <FieldTitle>Permissions</FieldTitle>
          </FieldLegend>
          <FieldDescription>Select the permissions you want.</FieldDescription>
        </div>

          <div className="flex w-full justify-end">
        <div className="flex flex-row w-full justify-end gap-2">
          <Checkbox id={`p-all`} name="terms-checkbox-basic" checked={selectAll} onCheckedChange={handleSelectAll}/>
          <FieldLabel htmlFor="terms-checkbox-basic">Select All</FieldLabel>
        </div>
        </div>
      </div>

      <div className="flex-col item-center justify-space-between max-h-[450px] overflow-x-auto">
        {template &&
          template?.map((item: PermissionTemplateType) => (
            <div id={item.menu_id}>
              <FieldGroup className="gap-2 mx-auto">
                <Field orientation="horizontal" className="pl-5 align-item-end">
                  <FieldLegend variant="label" className="mt-5 w-40">
                    <FieldTitle className="">{item.group_label}</FieldTitle>
                  </FieldLegend>
                  
                  <Checkbox
                    id={`p-${item.group_label}-view`}
                    name={`p-${item.group_label}-view`}
                    checked={selectedRows.has(`p-${item.group_label}-view`)}
                    onCheckedChange={(checked) =>
                    handleSelectRow(`p-${item.group_label}-view`,checked === true)
                    }
                  />
                  <FieldLabel htmlFor={`p-${item.group_label}-view`}>View</FieldLabel>

                  <Checkbox
                    id={`p-${item.group_label}-create`}
                    name={`p-${item.group_label}-create`}
                    checked={selectedRows.has(`p-${item.group_label}-create`)}
                  />
                  <FieldLabel htmlFor={`p-${item.group_label}-create`}>Create</FieldLabel>

                  <Checkbox
                    id={`p-${item.group_label}-update`}
                    name={`p-${item.group_label}-update`}
                    // checked={itemChecked(`p-${item.group_label}-update`)}
                  />
                  <FieldLabel htmlFor={`p-${item.group_label}-update`}>Update</FieldLabel>

                  <Checkbox
                    id={`p-${item.group_label}-delete`}
                    name={`p-${item.group_label}-delete`}
                  />
                  <FieldLabel htmlFor={`p-${item.group_label}-delete`}>Delete</FieldLabel>
                </Field>
              </FieldGroup>
              <FieldGroup className="gap-2 mx-auto">
                {item?.menu &&
                  item?.menu.map((menu: MenuType) => (
                    <Field orientation="horizontal" className="pl-5 align-item-end">
                      <FieldLabel
                        htmlFor="terms-checkbox-basic"
                        className="pl-5 w-40 text-muted-foreground"
                      >
                        {menu.label}
                      </FieldLabel>

                      <Checkbox
                        id={`p-${item.group_label}-${menu.label}-view`}
                        name={`p-${item.group_label}-${menu.label}-view`}
                        checked={selectedRows.has(`p-${item.group_label}-${menu.label}-view`)}
                        onCheckedChange={(checked) =>
                        handleSelectRow(`p-${item.group_label}-${menu.label}-view`,checked === true)
                        }
                      />
                      <FieldLabel htmlFor={`p-${item.group_label}-${menu.label}-view`} className="text-muted-foreground">
                        View
                      </FieldLabel>

                      <Checkbox
                        id={`p-${item.group_label}-${menu.label}-create`}
                        name={`p-${item.group_label}-${menu.label}-create`}
                      />
                      <FieldLabel htmlFor={`p-${item.group_label}-${menu.label}-create`} className="text-muted-foreground">
                        Create
                      </FieldLabel>

                      <Checkbox
                        id={`p-${item.group_label}-${menu.label}-update`}
                        name={`p-${item.group_label}-${menu.label}-update`}
                      />
                      <FieldLabel htmlFor={`p-${item.group_label}-${menu.label}-update`} className="text-muted-foreground">
                        Update
                      </FieldLabel>

                      <Checkbox
                        id={`p-${item.group_label}-${menu.label}-delete`}
                        name={`p-${item.group_label}-${menu.label}-delete`}
                      />
                      <FieldLabel htmlFor={`p-${item.group_label}-${menu.label}-delete`} className="text-muted-foreground">
                        Delete
                      </FieldLabel>
                    </Field>
                  ))}
              </FieldGroup>
            </div>
          ))}
      </div>
    </FieldSet>
  );
}
