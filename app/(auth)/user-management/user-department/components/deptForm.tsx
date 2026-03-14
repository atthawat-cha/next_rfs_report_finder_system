import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { DepartmentType } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import React from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

type Props = {
    deptId?: string;
}

export default function DeptForm({ deptId }: Props) {

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
                return toast.error("You don't have permission to access this page");
            }

            if (!res.ok) {
                console.error(await res.text());
                return;
            }

            const data = await res.json();
            if (!data?.success) {
                return;
            }
            toast.success("Department has been created successfully");
            setLoading(false);
            setParams({
                name: '',
                code: '',
                is_active: true,
            });
            router.push("/user-management/user-department");
            // router.refresh();
        } catch (error) {
            toast.error("Error creating department");
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handlerSubmit}>
            <div className="-mx-4 no-scrollbar max-h-[50vh] overflow-y-auto px-4">
                <div className="w-full space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                        id="name"
                        type="text"
                        placeholder="Name"
                        value={params?.name}
                        autoComplete="off"
                        onChange={(e) =>
                            setParams({ ...params, name: e.target.value })
                        }
                        required
                        disabled={loading}
                    />
                    <FieldDescription className="text-sm text-muted-foreground pl-2">
                        The Department name must be at least 3 characters long
                    </FieldDescription>
                </div>

                <div className="w-full space-y-2">
                    <Label htmlFor="code">Code</Label>
                    <Input
                        id="code"
                        type="text"
                        placeholder="Code"
                        value={params?.code}
                        autoComplete="off"
                        onChange={(e) =>
                            setParams({ ...params, code: e.target.value })
                        }
                        required
                        disabled={loading}
                    />
                    <FieldDescription className="text-sm text-muted-foreground pl-2">
                        The code must be at uppercase
                    </FieldDescription>
                </div>

                <div className="w-full gap-5 my-5">
                    <Label htmlFor="is_active">Status</Label>
                    <Field orientation="horizontal" className="w-fit mt-2">
                        <Switch id="is_active" name="is_active" checked={params?.is_active} onCheckedChange={(checked) =>
                            setParams({ ...params, is_active: checked })
                        } />
                        <FieldLabel htmlFor="is_active">{params?.is_active ? "Active" : "Inactive"}</FieldLabel>
                    </Field>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">{loading ? "Saving..." : "Save changes"}</Button>
            </DialogFooter>
        </form>
    );
}