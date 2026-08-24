import { Fragment } from "react";
import { Link } from "@/i18n/navigation";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../ui/breadcrumb";

export interface BreadcrumbTrailItem {
    label: string;
    href?: string;
}

/**
 * Previously hardcoded the same "Dashboard / Management / Reports" trail for
 * every one of its ~10 importers regardless of which page rendered it (found
 * during Phase 9a, fixed here during Phase 11c since every caller needed
 * translating anyway) - each page now passes its own real trail.
 */
export default function DefaultBreadcrumb({ items }: { items: BreadcrumbTrailItem[] }) {
    return (
        <Breadcrumb>
            <BreadcrumbList>
                {items.map((item, index) => (
                    <Fragment key={index}>
                        <BreadcrumbItem>
                            {item.href ? (
                                <BreadcrumbLink asChild>
                                    <Link href={item.href}>{item.label}</Link>
                                </BreadcrumbLink>
                            ) : (
                                <BreadcrumbPage>{item.label}</BreadcrumbPage>
                            )}
                        </BreadcrumbItem>
                        {index < items.length - 1 && <BreadcrumbSeparator />}
                    </Fragment>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    )
}
