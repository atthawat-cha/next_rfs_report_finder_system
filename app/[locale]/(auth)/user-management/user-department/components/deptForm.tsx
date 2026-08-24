import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { DepartmentType } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import React from "react";
import toast from "react-hot-toast";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function DeptForm() {
    const t = useTranslations("userManagement.department.form");
    const tc = useTranslations("common");

    const [params, setParams] = React.useState<DepartmentType>({
        name: '',
        code: '',
        is_active: true,
    });
    const [loading, setLoading] = React.useState(false);
    const router = useRouter();

    const handlerSubmit = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/users/departments', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
                credentials: "include",
                body: JSON.stringify(params),
            })
            if (!res.ok && res.status !== 403) {
                throw new Error('Failed to fetch departments');
            }

            if (res.status === 403) {
                return toast.error(t("noPermission"));
            }

            if (!res.ok) {
                console.error(await res.text());
                return;
            }

            const data = await res.json();
            if (!data?.success) {
                return;
            }
            toast.success(t("createSuccess"));
            setLoading(false);
            setParams({
                name: '',
                code: '',
                is_active: true,
            });
            router.push("/user-management/user-department");
            // router.refresh();
        } catch {
            toast.error(t("createError"));
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handlerSubmit}>
            <div className="-mx-4 no-scrollbar max-h-[50vh] overflow-y-auto px-4">
                <div className="w-full space-y-2">
                    <Label htmlFor="name">{t("nameLabel")}</Label>
                    <Input
                        id="name"
                        type="text"
                        placeholder={t("namePlaceholder")}
                        value={params?.name}
                        autoComplete="off"
                        onChange={(e) =>
                            setParams({ ...params, name: e.target.value })
                        }
                        required
                        disabled={loading}
                    />
                    <FieldDescription className="text-sm text-muted-foreground pl-2">
                        {t("nameHint")}
                    </FieldDescription>
                </div>

                <div className="w-full space-y-2">
                    <Label htmlFor="code">{t("codeLabel")}</Label>
                    <Input
                        id="code"
                        type="text"
                        placeholder={t("codePlaceholder")}
                        value={params?.code}
                        autoComplete="off"
                        onChange={(e) =>
                            setParams({ ...params, code: e.target.value })
                        }
                        required
                        disabled={loading}
                    />
                    <FieldDescription className="text-sm text-muted-foreground pl-2">
                        {t("codeHint")}
                    </FieldDescription>
                </div>

                <div className="w-full gap-5 my-5">
                    <Label htmlFor="is_active">{t("statusLabel")}</Label>
                    <Field orientation="horizontal" className="w-fit mt-2">
                        <Switch id="is_active" name="is_active" checked={params?.is_active} onCheckedChange={(checked) =>
                            setParams({ ...params, is_active: checked })
                        } />
                        <FieldLabel htmlFor="is_active">{params?.is_active ? tc('active') : tc('inactive')}</FieldLabel>
                    </Field>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">{tc('cancel')}</Button>
                </DialogClose>
                <Button type="submit">{loading ? t("saving") : t("saveChanges")}</Button>
            </DialogFooter>
        </form>
    );
}