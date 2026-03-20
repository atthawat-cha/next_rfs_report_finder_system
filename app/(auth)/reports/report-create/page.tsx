"use client";
import { ContentLayout } from "@/components/layouts/content-layout";
import React from "react";
import DefaultBreadcrumb from "@/components/shared/breadcrumb";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function ReportCreate() {
  const [baseSelect, setBaseSelect] = React.useState({
    departments: [],
    status: [],
    catagory: [],
  });

  const facthBaseData = async () => {
    const res = await fetch("/api/baseconfig/selections", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      credentials: "include",
    });

    if (!res.ok) {
      console.error(await res.text());
      return;
    }

    const data = await res.json();

    if (!data?.success) {
      return;
    }
    console.log(data?.baseConfig);
    const { baseDept, basereportStatus, baseCatagory } = data?.baseConfig;

    setBaseSelect({
      departments: baseDept,
      status: basereportStatus,
      catagory: baseCatagory,
    });
  };

  React.useEffect(() => {
    facthBaseData();
  }, []);

  return (
    <ContentLayout title="Report Create">
      <DefaultBreadcrumb />
      <Separator className="my-5" />
      <div className="w-full max-w-md">
        <form>
          <FieldGroup>
            <FieldSet>
              <FieldLegend>Report Creation</FieldLegend>
              <FieldDescription>
                Make your report and share it with your organization
              </FieldDescription>

              <FieldSet className="w-full max-w-xs">
                <FieldLegend variant="label">Report Type</FieldLegend>
                <RadioGroup defaultValue="crystal" className="flex space-x-2">
                  <Field orientation="horizontal">
                    <RadioGroupItem value="crystal" id="plan-monthly" />
                    <FieldLabel htmlFor="plan-monthly" className="font-normal">
                      Crystal
                    </FieldLabel>
                  </Field>
                  <Field orientation="horizontal">
                    <RadioGroupItem value="jasper" id="plan-yearly" />
                    <FieldLabel htmlFor="plan-yearly" className="font-normal">
                      Jasper
                    </FieldLabel>
                  </Field>
                </RadioGroup>
              </FieldSet>
              <FieldSeparator />

              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="rp_code">Code</FieldLabel>
                  <Input id="rp_code" placeholder="{Anes-0001}" required />
                  <FieldDescription>Ex. Department-0001</FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="rp_name">Name</FieldLabel>
                  <Input id="rp_name" placeholder="Report Name" required />
                </Field>

                <FieldSet>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="crp_description">
                        Description
                      </FieldLabel>
                      <Textarea
                        id="crp_description"
                        placeholder="Add any additional information"
                        className="resize-none"
                      />
                    </Field>
                  </FieldGroup>
                </FieldSet>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="checkout-exp-month-ts6">
                      Catagory
                    </FieldLabel>
                    <Select defaultValue="">
                      <SelectTrigger id="rp_catagory">
                        <SelectValue placeholder="Catagory" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {baseSelect?.catagory?.map((item) => (
                            <SelectItem key={item?.id} value={item?.id}>
                              {item?.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="rp_department">Department</FieldLabel>
                    <Select defaultValue="">
                      <SelectTrigger id="rp_department">
                        <SelectValue placeholder="Department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {baseSelect?.departments?.map((item) => (
                            <SelectItem key={item?.id} value={item?.id}>
                              {item?.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </FieldGroup>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Report Status</FieldLegend>
              <FieldDescription>The report status</FieldDescription>
              <Select defaultValue="">
                <SelectTrigger id="rp_status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {baseSelect?.status?.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </FieldSet>

            <FieldSet>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="checkout-7j9-optional-comments">
                    Comments
                  </FieldLabel>
                  <Textarea
                    id="checkout-7j9-optional-comments"
                    placeholder="Add any additional comments"
                    className="resize-none"
                  />
                </Field>
              </FieldGroup>
            </FieldSet>

            <Field orientation="horizontal">
              <Button type="submit">Submit</Button>
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </div>
    </ContentLayout>
  );
}
