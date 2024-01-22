"use client";
import { useState } from "react";
import { OrangeLable } from "@/shared/svgImages/tableImages";
import Select from "react-select";
import { statusOptions } from "@/shared/static/studentsData.json";
import { usePathname } from "next/navigation";
import CollapseData from "./CollapseData";

const StudentRow = (props) => {
  const [activeRow, setActiveRow] = useState(0);
  const [showCollapse, setShowCollapse] = useState(false);
  const handleActiveRow = (request) => {
    setActiveRow(request);
    setShowCollapse((prev) => (activeRow === request ? !prev : true));
  };
  const pathName = usePathname();
  const {
    request,
    name,
    sales,
    phone,
    date,
    email,
    highestDegree,
    attendance,
    batch,
    setAlltrue,
  } = props;
  const handleStatusClick = (e) => {
    e.stopPropagation();
  };
  const [bgcolor, setbgcolor] = useState("#fff");
  const [color, setcolor] = useState("#000");
  const [status, setStatus] = useState({ label: "Status", value: "status" });

  const handleStatus = (selected) => {
    setStatus(selected);
    setbgcolor(selected.bgcolor);
    setcolor(selected.textColor);
  };
  const statusStyles = {
    option: (provided, state) => ({
      backgroundColor: state.data.bgcolor,
      color: state.data.textColor,
      cursor: "pointer",
      paddingBlock: "10px",
      paddingInline: "15px",
      fontWeight: "600",
      textAlign: "center",
      position: "relative",
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
      backgroundColor: bgcolor,
      color: color,
      cursor: "pointer",
      fontWeight: "600",
      textAlign: "center",
      width: "160px",
      height: "10px",
      borderRadius: "16px",
      boxShadow: "1px 1px 6px rgb(0,0,0,0.1)",
    }),
    singleValue: (provided) => ({
      ...provided,
      color: color,
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

  return (
    <>
      <tr
        onClick={() => {
          handleActiveRow(request);
        }}
        className={`text-[14px] cursor-pointer ${
          activeRow === request && showCollapse
            ? "border-b border-black border-dotted"
            : ""
        } flex items-center justify-between w-[100%] font-[400]`}
      >
        <td className="flex flex-shrink-0 items-center w-[8%]  pl-[20px] gap-[20px] py-[16px]">
          <div className="drop-shadow ">
            <OrangeLable />
          </div>
          <p>{request}</p>
        </td>
        <td
          title={name}
          className="py-[16px] flex-shrink-0 w-[20%] text-ellipsis text-center  whitespace-nowrap overflow-hidden"
        >
          {name}
        </td>
        <td className="py-[16px] flex-shrink-0 w-[6%] text-center">
          {pathName === "/unreadrequests" ? "-" : batch}
        </td>
        <td className="py-[16px] flex-shrink-0 w-[10%] text-center">
          {pathName === "/unreadrequests" ? "-" : attendance}
        </td>
        <td className="py-[16px] flex-shrink-0 w-[10%] text-center">{phone}</td>
        <td className="py-[16px] flex-shrink-0 w-fit">
          {
            <div
              onClick={handleStatusClick}
              className={`font-[600] flex justify-center rounded-[16px] items-center`}
            >
              <Select
                getOptionLabel={(option) => option.label}
                styles={statusStyles}
                options={statusOptions}
                onChange={handleStatus}
                isSearchable={false}
                value={status}
              />
            </div>
          }
        </td>
        <td className="py-[16px] flex-shrink-0 w-[15%] text-ellipsis text-center  whitespace-nowrap overflow-hidden">
          {pathName === "/unreadrequests" ? "-" : sales}
        </td>
        <td className="text-center py-[16px] flex-shrink-0 w-[15%]">{date}</td>
      </tr>
      {activeRow === request && showCollapse ? (
        <tr className={`w-full ${activeRow && "bg-gray-100 "} flex`}>
          <td className="px-[50px] py-[10px] w-full" colSpan="10">
            <CollapseData handleActiveRow={()=>handleActiveRow(request)} email={email} highestDegree={highestDegree} />
          </td>
        </tr>
      ) : (
        ""
      )}
    </>
  );
};
export default StudentRow;
