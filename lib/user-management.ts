import { MenuType, PermissionTemplateType } from "./types"

const actions = ["view", "create", "update", "delete"] as const
export const perConvertToCheckbox = (per:PermissionTemplateType[]):string[] => {
    const checkData:string[] = []

    console.log(per)
    per.length > 0 && per.forEach((item:PermissionTemplateType) => {
        item?.menu?.forEach((menu: MenuType) => {
            actions.forEach((action) => {
                if(menu[`can_${action}`]){
                    checkData.push(`p-${item.group_label}-${menu.label}-${action}`)
                }
            })

            menu?.submenus?.length > 0 && menu?.submenus?.forEach((submenu: any) => {
                actions.forEach((action) => {
                    if(submenu[`can_${action}`]){
                        checkData.push(`p-${item.group_label}-${menu.label}-${submenu.label}-${action}`)
                    }
                })
            })
        })
    }) 

    return checkData
}