"use client";
import {
  LeftArrow,
  OrangeLable,
  RightArrow,
  IconCalender,
  UserIcon,
} from "@/shared/svgImages/tableImages";
import "./studentTable.module.css";
import StudentRow from "../StudentRow";
import Select from "react-select";
import { tableData } from "@/shared/static/studentsData.json";
import { usePathname } from "next/navigation";

const StudetTable = () => {
  const path = usePathname();
  const filterPaths = ["/personwisepayment", "/monthwisepayment"];
  const MonthOptions = [
    { label: "January", value: "january" },
    { label: "February", value: "february" },
    { label: "March", value: "march" },
    { label: "April", value: "april" },
    { label: "May", value: "may" },
    { label: "June", value: "june" },
    { label: "July", value: "july" },
    { label: "August", value: "august" },
    { label: "September", value: "september" },
    { label: "October", value: "october" },
    { label: "November", value: "november" },
    { label: "December", value: "december" },
  ];
  const PersonOptions = [
    { label: "Rakesh", value: "rakesh" },
    { label: "Suresh", value: "suresh" },
    { label: "Daniel", value: "daniel" },
    { label: "Shreelata", value: "shreelata" },
  ];
  const SelectorStyles = {
    option: (provided, state) => ({
      cursor: "pointer",
      paddingBlock: "10px",
      paddingInline: "15px",
      fontWeight: "600",
      textAlign: "center",
      position: "relative",
      borderBottom: "1px solid rgb(0,0,0,0.1)",
    }),
    control: (provided, state) => ({
      ...provided,
      border: "0",
      boxShadow: "none",
      "&:hover": {
        borderColor: "none",
      },
      "&:active": {
        outline: "none",
      },
      cursor: "pointer",
      fontWeight: "600",
      textAlign: "center",
      width: "180px",
      height: "10px",
    }),
    singleValue: (provided) => ({
      ...provided,
      borderRadius: "16px",
    }),
    dropdownIndicator: (base) => ({
      ...base,
      color: "black",
      "&:hover": {
        color: "black",
      },
    }),
  };
  const labelColor = path === "/unreadrequests" ? "#F2F2F2" : "#F68737";
  return (
    <main className="flex flex-col items-end gap-[10px]">
      <div className="w-full gap-[24px] items-center flex text-[16px] font-[700] ">
        {filterPaths.includes(path) && (
          <div className="ml-[35%] flex  border items-center shadow px-[10px] py-[5px] rounded-[12px]">
            {filterPaths[1] === path ? (
              <IconCalender />
            ) : filterPaths[0] === path ? (
              <UserIcon />
            ) : (
              ""
            )}

            <Select
              options={
                filterPaths[1] === path
                  ? MonthOptions
                  : filterPaths[0] === path
                  ? PersonOptions
                  : ""
              }
              placeholder={`${
                filterPaths[1] === path
                  ? "Month"
                  : filterPaths[0] === path
                  ? "Person"
                  : ""
              }`}
              styles={SelectorStyles}
            />
          </div>
        )}
        <p className="ml-auto">1 - 9 of 55</p>{" "}
        <div className="flex">
          <LeftArrow className="cursor-pointer" />
          <RightArrow className="cursor-pointer" />
        </div>
      </div>
      <table className="shadow-[0_4px_4px_0px_rgba(0,0,0,0.25)] flex flex-col rounded-[16px] overflow-hidden w-[100%]">
        <thead className="bg-black flex w-[100%]  text-white">
          <tr className="flex w-[100%] justify-between items-center">
            <th className="flex flex-shrink-0 items-center w-[8%] pl-[20px] gap-[20px] py-[16px]">
              <OrangeLable  fill={labelColor} stroke={labelColor}/> #{" "}
            </th>
            <th className="py-[13px] flex-shrink-0 w-[20%] text-ellipsis text-center  whitespace-nowrap overflow-hidden ">
              Name
            </th>
            <th className="py-[13px] flex-shrink-0 w-[6%] text-center">
              Batch
            </th>
            <th className="py-[13px] flex-shrink-0 w-[10%] text-center">
              Attendance
            </th>
            <th className="py-[13px] flex-shrink-0 w-[10%] text-ellipsis text-center whitespace-nowrap overflow-hidden ">
              Phone
            </th>
            <th className="py-[13px] flex-shrink-0 w-[162px]">Status</th>
            <th className="py-[13px] w-[15%] text-ellipsis text-center  whitespace-nowrap overflow-hidden">
              Sales person
            </th>
            <th className="py-[13px] text-center flex-shrink-0 w-[15%]">
              Date
            </th>
          </tr>
        </thead>
        <tbody>
          {tableData.map((item, idx) => (
            <StudentRow
              request={item.request}
              name={item.name}
              sales={item.sales}
              batch={item.batch}
              attendance={item.attendance}
              phone={item.phone}
              status={item.status}
              date={item.date}
              email={item.email}
              highestDegree={item.highestDegree}
              labelColor={labelColor}
            />
          ))}
        </tbody>
      </table>
    </main>
  );
};
export default StudetTable;
