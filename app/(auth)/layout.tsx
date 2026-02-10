import AuthenticationLayout from "@/components/layouts/authenticationLayout";

export default function DemoLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AuthenticationLayout>{children}</AuthenticationLayout>;
}
