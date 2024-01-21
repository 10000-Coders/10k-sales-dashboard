"use client";
import { usePathname } from "next/navigation";
import dayjs from "dayjs";
import { useState } from "react";
import { DemoContainer } from "@mui/x-date-pickers/internals/demo";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { MobileDatePicker } from "@mui/x-date-pickers/MobileDatePicker";
import Select from "react-select";
import { EmailIcon, LinkIcon, LockIcon } from "@/shared/svgImages/tableImages";
import { salesOptions } from "@/shared/static/studentsData.json";

const CollapseData = ({ email, highestDegree }) => {
  const pathName = usePathname();
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
  return (
    <div className="flex py-[15px] w-full flex-col gap-[30px]">
      <div className="flex flex-col gap-[15px]">
        <p className="text-[10px] uppercase tracking-[3.6px] font-[700] text-vivid_orange">
          Student Details
        </p>
        <div className="text-[14px] gap-[50px] justify-between w-full flex">
          <p className="flex  gap-[5px]">
            Email :<span className="font-[700] inline">{email}</span>
            <LinkIcon className="inline" />
          </p>
          <p className="flex gap-[5px]">
            Highest Degree :{" "}
            <span className="font-[700]">
              {pathName === "/unreadrequests" ? "" : highestDegree}
            </span>
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
                  <MobileDatePicker defaultValue={dayjs("2022-04-17")} />
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
  );
};
export default CollapseData;
