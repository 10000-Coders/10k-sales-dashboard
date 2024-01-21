"use client";
import { useState } from "react";
import {
  EmailIcon,
  LinkIcon,
  LockIcon,
  OrangeLable,
} from "@/shared/svgImages/tableImages";
import Select from "react-select";

const StudentRow = (props) => {
  const [activeRow, setActiveRow] = useState(0);
  const [showCollapse, setShowCollapse] = useState(false);
  const handleActiveRow = (request) => {
    setActiveRow(request);
    setShowCollapse((prev) => (activeRow === request ? !prev : true));
  };
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
  } = props;
  const handleStatusClick = (e) => {
    e.stopPropagation();
  };
  const style1 = {
    control: (base, state) => ({
      ...base,
      border: "none",
      boxShadow: "none",
      "&:hover": {
        outline: "none",
        border: "none",
      },
      borderRadius: "16px",
      fontWeight: "bold",
      background: "#E6E6E6",
    }),
  };
  const [bgcolor, setbgcolor] = useState("#fff");
  const [color, setcolor] = useState("#000");
  const [status, setStatus] = useState({ label: "Status", value: "status" });
  const handleStatus = (selected) => {
    setStatus(selected);
    setbgcolor(selected.bgcolor);
    setcolor(selected.textColor);
  };
  const style = {
    option: (provided, state) => ({
      backgroundColor: state.data.bgcolor,
      color: state.data.textColor,
      cursor: "pointer",
      paddingBlock: "10px",
      paddingInline: "15px",
      fontWeight: "600",
      textAlign: "center",
      position: "relative"
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
    }),
  };

  const options = [
    {
      label: "Intrested",
      value: "Intrested",
      bgcolor: "#96E367",
      textColor: "black",
    },
    {
      label: "Unavailable",
      value: "Unavailable",
      bgcolor: "#3D3D3D",
      textColor: "white",
    },
    {
      label: "Ready to Pay",
      value: "Ready to Pay",
      bgcolor: "#F68737",
      textColor: "white",
    },
    {
      label: "Not Intrested",
      value: "Not Intested",
      bgcolor: "white",
      textColor: "black",
    },
  ];
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
          <OrangeLable /> <p>{request}</p>
        </td>
        <td
          title={name}
          className="py-[16px] flex-shrink-0 w-[20%] text-ellipsis text-center  whitespace-nowrap overflow-hidden"  
        >
          {name}
        </td>
        <td className="py-[16px] flex-shrink-0 w-[6%] text-center">{batch}</td>
        <td className="py-[16px] flex-shrink-0 w-[10%] text-center">{attendance}</td>
        <td className="py-[16px] flex-shrink-0 w-[10%] text-center">{phone}</td>
        <td className="py-[16px] flex-shrink-0 w-fit">
          {
            <div
              onClick={handleStatusClick}
              className={`font-[600] flex justify-center rounded-[16px] items-center`}
            >
              <Select
                getOptionLabel={(option) => option.label}
                styles={style}
                options={options}
                onChange={handleStatus}
                isSearchable={false}
                value={status}
              />
            </div>
          }
        </td>
        <td className="py-[16px] flex-shrink-0 w-[15%] text-ellipsis text-center  whitespace-nowrap overflow-hidden">{sales}</td>
        <td className="text-center py-[16px] flex-shrink-0 w-[15%]">{date}</td>
      </tr>
      {activeRow === request && showCollapse ? (
        <tr className="w-full border flex">
          <td className="px-[50px] py-[10px]" colSpan="8">
            <div className="flex py-[15px] w-full flex-col gap-[30px]">
              <div className="flex flex-col gap-[10px]">
                <p className="text-[10px] uppercase font-[700] text-[#FF8000]">
                  Student Details
                </p>
                <div className="text-[14px] gap-[50px] justify-between w-full flex">
                  <p className="flex  gap-[5px]">
                    Email :<span className="font-[700] inline">{email}</span>
                    <LinkIcon className="inline" />
                  </p>
                  <p className="flex gap-[5px]">
                    Highest Degree :{" "}
                    <span className="font-[700]">{highestDegree}</span>
                  </p>
                  <div className="flex items-center gap-[5px]">
                    <p>Approached via : </p>
                    <div className="flex gap-[10px]">
                      <input type="radio" name="approach" id="online" />
                      <label htmlFor="online">Online</label>
                      <input type="radio" name="approach" id="Offline" />
                      <label htmlFor="Offline">Offline</label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-[10px]">
                <p className="text-[10px] uppercase font-[700] text-[#FF8000]">
                  communication details
                </p>
                <div className="flex  gap-[20px]">
                  <div className="flex flex-shrink-0 gap-[10px] items-center w-[40%]">
                    <p className="w-fit flex-shrink-0">Sales Executive:</p>{" "}
                    <Select
                      styles={style1}
                      placeholder="Name"
                      isSearchable={false}
                      className="w-full focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-[10px] w-full items-center">
                    <label htmlFor="remarks" className="flex-shrink-0">
                      Call Remarks
                    </label>
                    <input
                      type="text"
                      id="remarks"
                      placeholder="Remarks"
                      className="focus:outline-none w-full rounded-[16px] py-[7px] px-[10px] bg-[#E6E6E6]"
                    />
                  </div>
                </div>
              </div>
              <div className="flex mx-auto gap-[60px]">
                <button className="w-[300px] py-[10px] rounded-[16px] bg-[#FF8000] flex justify-center gap-[10px] text-white font-bold">
                  <EmailIcon /> Send Payment Link on Email
                </button>
                <button className="w-[300px] py-[10px] rounded-[16px] bg-[#B5B5B5] flex justify-center gap-[10px] text-white font-bold">
                  <LockIcon /> Give Dashboard Access
                </button>
              </div>
            </div>
          </td>
        </tr>
      ) : (
        ""
      )}
    </>
  );
};
export default StudentRow;
