'use client'

import * as React from 'react'
import { Link } from '@/i18n/navigation'
import { ContentLayout } from '@/components/layouts/content-layout'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import PermissionsFormCheckbox from '@/components/shared/permissions-form'
import { PermissionTemplateType, RolePermissionsType, RolesType } from '@/lib/types'
import { perConvertToCheckbox } from '@/lib/user-management'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslations } from 'next-intl'

/**
 * Fills in the app/(auth)/permissions/page.tsx stub. Reuses
 * PermissionsFormCheckbox (the same matrix role-form's create flow uses)
 * rather than a second implementation - role selector -> GET
 * /api/users/roles/[id] seeds the checkboxes with the role's real grants ->
 * Save calls PUT on the same endpoint.
 *
 * No client-side admin gate - matches this repo's established pattern
 * (e.g. /settings/general) of relying on the API's 403 as the real
 * boundary; a non-admin here sees a plain "no access" message instead.
 */
export default function PermissionManagement() {
  const t = useTranslations('roleManagement.permissions')
  const tc = useTranslations('common')
  const [roles, setRoles] = React.useState<RolesType[]>([])
  const [loadingRoles, setLoadingRoles] = React.useState(true)
  const [forbidden, setForbidden] = React.useState(false)
  const [selectedRoleId, setSelectedRoleId] = React.useState<string>('')

  const [template, setTemplate] = React.useState<PermissionTemplateType[] | null>(null)
  const [loadingTemplate, setLoadingTemplate] = React.useState(false)
  const [params, setParams] = React.useState<RolePermissionsType & { permissions: string[] }>({
    role: { name: '', display_name: '' },
    permissions: [],
  })
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    fetch('/api/users/roles', { credentials: 'include' })
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          setForbidden(true)
          return null
        }
        return res.json()
      })
      .then((data) => {
        if (Array.isArray(data)) setRoles(data)
      })
      .finally(() => setLoadingRoles(false))
  }, [])

  React.useEffect(() => {
    if (!selectedRoleId) {
      setTemplate(null)
      return
    }
    setLoadingTemplate(true)
    fetch(`/api/users/roles/${selectedRoleId}`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.success) setTemplate(json.data.template)
      })
      .finally(() => setLoadingTemplate(false))
  }, [selectedRoleId])

  const initialSelected = React.useMemo(
    () => (template ? perConvertToCheckbox(template) : []),
    [template]
  )

  const handleSave = async () => {
    if (!selectedRoleId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/users/roles/${selectedRoleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ permissions: params.permissions }),
      })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        toast.error(json?.error ?? t('saveError'))
        return
      }
      toast.success(t('saveSuccess'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <ContentLayout title={t('pageTitle')}>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">{tc('breadcrumbDashboard')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">{t('breadcrumbManagement')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{t('breadcrumbPermissions')}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>{t('cardTitle')}</CardTitle>
            <CardDescription>{t('cardDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {forbidden && <p className="text-muted-foreground">{t('forbidden')}</p>}

            {!forbidden && (
              <>
                {loadingRoles ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                    <SelectTrigger className="max-w-sm">
                      <SelectValue placeholder={t('selectRolePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {roles.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.display_name || r.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}

                {loadingTemplate && (
                  <div className="flex items-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" /> {tc('loading')}
                  </div>
                )}

                {!loadingTemplate && template && (
                  <>
                    <PermissionsFormCheckbox
                      key={selectedRoleId}
                      params={params}
                      setParams={setParams}
                      template={template}
                      initialSelected={initialSelected}
                    />
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? tc('saving') : tc('save')}
                    </Button>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </ContentLayout>
  )
}
