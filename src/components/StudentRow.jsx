"use client";
import { useState } from "react";
import {
  EmailIcon,
  LinkIcon,
  LockIcon,
  OrangeLable,
} from "@/shared/svgImages/tableImages";
import Select from "react-select";
import { statusOptions } from "@/shared/static/studentsData.json";
import dayjs from "dayjs";
import { DemoContainer } from "@mui/x-date-pickers/internals/demo";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { MobileDatePicker } from "@mui/x-date-pickers/MobileDatePicker";
import { usePathname } from "next/navigation";

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
  const [salesBgcolor, setsalesBgcolor] = useState("#fff");
  const [salesColor, setsalesColor] = useState("#000");
  const [sellsPersonName, setsellsPersonName] = useState({
    label: "Name",
    value: "name",
  });
  const [paymentsalesPersonName, setpaymentsalesPersonName] = useState({
    label: "Name",
    value: "name",
  });
  const [paymentsalesBgcolor, setpaymentsalesBgcolor] = useState("#fff");
  const [paymentsalesColor, setpaymentsalesColor] = useState("#000");
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
  const handlesellsPersonName = (selected) => {
    setsellsPersonName(selected);
    setsalesBgcolor(selected.bgcolor);
    setsalesColor(selected.textColor);
  };
  const handlepaymentsalesPerson = (selected) => {
    setpaymentsalesPersonName(selected);
    setpaymentsalesBgcolor(selected.bgcolor);
    setpaymentsalesColor(selected.textColor);
  };
  const salesStyle = {
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
      backgroundColor: salesBgcolor,
      color: salesColor,
      cursor: "pointer",
      fontWeight: "600",
      textAlign: "center",
      width: "100%",
      height: "10px",
      borderRadius: "16px",
      boxShadow: "1px 1px 6px rgb(0,0,0,0.1)",
    }),
    singleValue: (provided) => ({
      ...provided,
      color: salesColor,
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
  const paymentsalesStyle = {
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
      backgroundColor: paymentsalesBgcolor,
      color: paymentsalesColor,
      cursor: "pointer",
      fontWeight: "600",
      textAlign: "center",
      width: "100%",
      height: "10px",
      borderRadius: "16px",
      boxShadow: "1px 1px 6px rgb(0,0,0,0.1)",
    }),
    singleValue: (provided) => ({
      ...provided,
      color: paymentsalesColor,
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
  const salesOptions = [
    {
      label: "Suresh",
      value: "Suresh",
      bgcolor: "#96E367",
      textColor: "black",
    },
    {
      label: "Danial",
      value: "Danial",
      bgcolor: "#9E61DB",
      textColor: "white",
    },
    {
      label: "Rakesh",
      value: "Rakesh",
      bgcolor: "#F63737",
      textColor: "white",
    },
    {
      label: "Shreelata",
      value: "Shreelata",
      bgcolor: "#FFF",
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
        <td className="py-[16px] flex-shrink-0 w-[6%] text-center">{pathName === "/unreadrequests" ? "-" :batch}</td>
        <td className="py-[16px] flex-shrink-0 w-[10%] text-center">
          {pathName === "/unreadrequests" ? "-" :attendance}
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
          {pathName === "/unreadrequests" ? "-" :sales}
        </td>
        <td className="text-center py-[16px] flex-shrink-0 w-[15%]">{date}</td>
      </tr>
      {activeRow === request && showCollapse ? (
        <tr className={`w-full ${activeRow && "bg-gray-100 "} flex`}>
          <td className="px-[50px] py-[10px] w-full" colSpan="10">
            <div className="flex py-[15px] w-full flex-col gap-[30px]">
              <div className="flex flex-col gap-[15px]">
                <p className="text-[10px] uppercase tracking-[3.6px] font-[700] text-vivid_orange">
                  Student Details
                </p>
                <div className="text-[14px] gap-[50px] justify-between w-full flex">
                  <p className="flex  gap-[5px]">
                    Email :
                    <span className="font-[700] inline">
                      { email}
                    </span>
                    {pathName === "/unreadrequests" ? "" :<LinkIcon className="inline" />}
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
              <div className="flex flex-col gap-[15px]">
                <p className="text-[10px] uppercase tracking-[3.6px] font-[700] text-vivid_orange">
                  communication details
                </p>
                <div className="flex  gap-[20px]">
                  <div className="flex flex-shrink-0 gap-[10px] items-center w-[40%]">
                    <p className="w-fit flex-shrink-0">Sales Executive:</p>{" "}
                    <div className="w-full">
                      <Select
                        getOptionLabel={(option) => option.label}
                        styles={salesStyle}
                        options={salesOptions}
                        onChange={handlesellsPersonName}
                        isSearchable={false}
                        value={sellsPersonName}
                      />
                    </div>
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
                <button className="w-[300px] py-[10px] rounded-[16px] bg-vivid_orange flex justify-center gap-[10px] text-white font-bold">
                  <EmailIcon /> Send Payment Link on Email
                </button>
                <button className="w-[300px] py-[10px] rounded-[16px] bg-[#B5B5B5] flex justify-center gap-[10px] text-white font-bold">
                  <LockIcon /> Give Dashboard Access
                </button>
              </div>
              <div className="flex flex-col gap-[15px]">
                <p className="text-[10px] tracking-[3.6px] uppercase font-[700] text-vivid_orange">
                  payment details
                </p>
                <div className="flex justify-between">
                  <div className="flex items-center gap-[10px]">
                    Date:{" "}
                    <div className=" overflow-hidden h-[30px] cursor-pointer flex items-center w-[140px] rounded-[16px]  justify-center  bg-gray-200 font-bold">
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DemoContainer
                          components={[
                            "DatePicker",
                            "MobileDatePicker",
                            "DesktopDatePicker",
                            "StaticDatePicker",
                          ]}
                        >
                          <MobileDatePicker
                            defaultValue={dayjs("2022-04-17")}
                          />
                        </DemoContainer>
                      </LocalizationProvider>
                    </div>
                  </div>
                  <div className="flex  items-center gap-[10px]">
                    <p className="flex-shrink-0">Sales Exective:</p>
                    <div className="w-[150px] flex-shrink-0">
                      <Select
                        getOptionLabel={(option) => option.label}
                        styles={paymentsalesStyle}
                        options={salesOptions}
                        onChange={handlepaymentsalesPerson}
                        isSearchable={false}
                        value={paymentsalesPersonName}
                      />
                    </div>
                  </div>
                  <div className="flex gap-[10px] w-[200px]  items-center ">
                    <p className="flex-shrink-0 ">Amount : </p>
                    <input
                      type="text"
                      className="focus:outline-none text-center rounded-[16px] font-semibold bg-gray-200 w-[60%] block border"
                    />
                  </div>
                  <div className="flex items-center gap-[10px]">
                    <p className="felex-shrink-0">Mode of payment: </p>
                    <div className="w-[150px] flex-shrink-0">
                      <Select />
                    </div>
                  </div>
                </div>
                <div className="flex gap-[20px] w-fit">
                  <button className="bg-vivid_orange flex-shrink-0 shadow text-white rounded-[16px] px-[15px] py-[6px]">
                    submit
                  </button>
                  <button className="border flex-shrink-0 shadow rounded-[16px] px-[15px] py-[6px]">
                    Cancel
                  </button>
                </div>
                <button className=" text-gray-600 border-gray-400 border px-[10px] py-[10px] w-fit  rounded-[16px]">
                  + Add payment
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
