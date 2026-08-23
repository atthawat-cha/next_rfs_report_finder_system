import React, { useEffect } from "react";
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
import _ from "lodash";

export default function PermissionsFormCheckbox({
  setParams,
  template,
  initialSelected,
}: {
  // Still part of the props contract (both call sites pass it) even though
  // the functional setParams updater below no longer needs to read it here.
  params: RolePermissionsType;
  setParams: React.Dispatch<React.SetStateAction<RolePermissionsType>>;
  template: PermissionTemplateType[];
  /** Pre-checks these ids on mount (edit flow). Omit for the create flow, which starts blank. */
  initialSelected?: string[];
}) {
  // Hooks must run unconditionally regardless of `template` (rules-of-hooks) -
  // the null-check that used to sit above them is now below, right before
  // the render branch that actually needs `template` to be present.
  const converted = template ? perConvertToCheckbox(template) : []
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(
    () => new Set(initialSelected ?? [])
  )
  const selectAll = selectedRows.size > converted.length
  // console.log(converted)

  const handleIdSplit = (id: string) => {
    return id.split("-")
  }

  const handleSelectAll = (checked: boolean) => {
    const groupSelected = new Set(selectedRows)
    if (checked && !selectAll) {
      // merge group id
      converted.map((id) =>{ 
        const sp = handleIdSplit(id) 
        const grpId = `p-${sp[1]}-${_.last(sp)}`
        if(!groupSelected.has(grpId)){
          groupSelected.add(grpId)
          groupSelected.add(id)
        }else{
          groupSelected.add(id)
        }
      })
      setSelectedRows(groupSelected)
    } else {
      setSelectedRows(new Set())
    }
  }

  const handleSelectGroupRows = (grpId:string,checked: boolean) => {
    const newSelected = new Set(selectedRows)

    // Split group id
    const groupsplit = handleIdSplit(grpId)

    if (checked) {
      newSelected.add(grpId)
      converted.filter((id) => id.startsWith(`p-${groupsplit[1]}-`) && id.endsWith(`-${groupsplit[2]}`)).forEach((id) => {
        newSelected.add(id)
      })
    } else {
      newSelected.delete(grpId)
      converted.filter((id) => id.startsWith(`p-${groupsplit[1]}-`) && id.endsWith(`-${groupsplit[2]}`)).forEach((id) => {
        newSelected.delete(id)
      })
    }
    setSelectedRows(newSelected)
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
  
  useEffect(() => {
    const selectedArray = Array.from(selectedRows)
    // Functional updater, not `{...params, ...}` off the closure - params is
    // a prop that gets a new reference on every setParams call, so depending
    // on it here would re-fire this effect after its own write and loop.
    setParams((prev) => ({...prev, permissions: selectedArray}))
  }, [selectedRows, setParams])

  if (!template) return null;

  return (
    <FieldSet>
      <div className="flex item-center justify-between my-2 gap-5">
        <div className="flex flex-col w-full justify-start">
            <FieldLegend variant="label">
            <FieldTitle className="text-xl">สิทธิ์การใช้งาน</FieldTitle>
          </FieldLegend>
          <FieldDescription>เลือกสิทธิ์ที่ต้องการ</FieldDescription>
        </div>

          <div className="flex w-full justify-end">
        <div className="flex flex-row w-full justify-end gap-2">
          <Checkbox id={`p-all`} name="terms-checkbox-basic" checked={selectAll} onCheckedChange={handleSelectAll}/>
          <FieldLabel htmlFor="terms-checkbox-basic">เลือกทั้งหมด</FieldLabel>
        </div>
        </div>
      </div>

      <div className="flex-col item-center justify-space-between max-h-[450px] overflow-x-auto">
        {template &&
          template?.map((item: PermissionTemplateType) => (
            <div key={item.menu_id} id={item.menu_id}>
              <FieldGroup className="gap-2 mx-auto">
                <Field orientation="horizontal" className="pl-5 align-item-end items-center">
                  <FieldLegend variant="label" className="mt-5 w-40">
                    <FieldTitle className="">{item.group_label}</FieldTitle>
                  </FieldLegend>
                  
                  <Checkbox
                    id={`p-${item.group_label}-view`}
                    name={`p-${item.group_label}-view`}
                    checked={selectedRows.has(`p-${item.group_label}-view`)}
                    onCheckedChange={(checked) =>
                    handleSelectGroupRows(`p-${item.group_label}-view`,checked === true)
                    }
                  />
                  <FieldLabel htmlFor={`p-${item.group_label}-view`}>ดู</FieldLabel>

                  <Checkbox
                    id={`p-${item.group_label}-create`}
                    name={`p-${item.group_label}-create`}
                    checked={selectedRows.has(`p-${item.group_label}-create`)}
                    onCheckedChange={(checked) =>
                    handleSelectGroupRows(`p-${item.group_label}-create`,checked === true)
                    }/>
                  <FieldLabel htmlFor={`p-${item.group_label}-create`}>สร้าง</FieldLabel>

                  <Checkbox
                    id={`p-${item.group_label}-update`}
                    name={`p-${item.group_label}-update`}
                    checked={selectedRows.has(`p-${item.group_label}-update`)}
                    onCheckedChange={(checked) =>
                    handleSelectGroupRows(`p-${item.group_label}-update`,checked === true)}
                  />
                  <FieldLabel htmlFor={`p-${item.group_label}-update`}>แก้ไข</FieldLabel>

                  <Checkbox
                    id={`p-${item.group_label}-delete`}
                    name={`p-${item.group_label}-delete`}
                    checked={selectedRows.has(`p-${item.group_label}-delete`)}
                    onCheckedChange={(checked) =>
                    handleSelectGroupRows(`p-${item.group_label}-delete`,checked === true)}
                  />
                  <FieldLabel htmlFor={`p-${item.group_label}-delete`}>ลบ</FieldLabel>
                </Field>
              </FieldGroup>
              <FieldGroup className="gap-2 mx-auto">
                {item?.menu &&
                  item?.menu.map((menu: MenuType) => (
                    <Field key={`${item.group_label}-${menu.label}`} orientation="horizontal" className="pl-5 align-item-end">
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
                        ดู
                      </FieldLabel>

                      <Checkbox
                        id={`p-${item.group_label}-${menu.label}-create`}
                        name={`p-${item.group_label}-${menu.label}-create`}
                        checked={selectedRows.has(`p-${item.group_label}-${menu.label}-create`)}
                        onCheckedChange={(checked) =>
                        handleSelectRow(`p-${item.group_label}-${menu.label}-create`,checked === true)}
                      />
                      <FieldLabel htmlFor={`p-${item.group_label}-${menu.label}-create`} className="text-muted-foreground">
                        สร้าง
                      </FieldLabel>

                      <Checkbox
                        id={`p-${item.group_label}-${menu.label}-update`}
                        name={`p-${item.group_label}-${menu.label}-update`}
                        checked={selectedRows.has(`p-${item.group_label}-${menu.label}-update`)}
                        onCheckedChange={(checked) =>
                        handleSelectRow(`p-${item.group_label}-${menu.label}-update`,checked === true)}
                      />
                      <FieldLabel htmlFor={`p-${item.group_label}-${menu.label}-update`} className="text-muted-foreground">
                        แก้ไข
                      </FieldLabel>

                      <Checkbox
                        id={`p-${item.group_label}-${menu.label}-delete`}
                        name={`p-${item.group_label}-${menu.label}-delete`}
                        checked={selectedRows.has(`p-${item.group_label}-${menu.label}-delete`)}
                        onCheckedChange={(checked) =>
                        handleSelectRow(`p-${item.group_label}-${menu.label}-delete`,checked === true)}
                      />
                      <FieldLabel htmlFor={`p-${item.group_label}-${menu.label}-delete`} className="text-muted-foreground">
                        ลบ
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
