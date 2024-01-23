"use client";
import React, { useState } from "react";
import Link from "next/link";
import { EyeIcon, MailIcon } from "@/shared/svgImages/navBarImages/index";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const handleShowPassword = () => setShowPassword(!showPassword);
  return (
    <main className="h-[100vh] flex items-center justify-center ">
      <form
        className={` h-[450px] rounded-[16px] px-[40px] py-[38px] border shadow flex flex-col w-[454px] gap-[24px] bg-white`}
      >
        <p className="text-center w-full text-[24px] font-[600] leading-[normal]">
          Login
        </p>
        <div className="flex flex-col gap-[8px]">
          <label
            className="block text-[13px] font-semibold  text-gray-900"
            htmlFor="Email ID"
          >
            Email ID
          </label>
          <div className="border-silver focus-within:border-Vivid_Tangelo focus-within:border  w-full gap-[8px] rounded-[8px] py-1 px-[15px] border flex">
            <MailIcon />{" "}
            <input
              required
              type="email"
              id="Email ID"
              name="Email ID"
              className="focus:outline-none"
            />
          </div>
          <div className="flex w-full flex-col gap-[8px]">
            <label
              className="block text-[13px] font-semibold  text-gray-900"
              htmlFor="Password"
            >
              Password
            </label>
            <div className="border-silver px-[15px]  w-full gap-[8px] rounded-[8px] py-1 border items-center flex ">
              <input
                required
                type={showPassword ? "password" : "text"}
                id="Password"
                name="Password"
                className="focus:outline-none w-full"
              />
              <div onClick={handleShowPassword}>
                <EyeIcon />
              </div>
            </div>
          </div>
        </div>
        <div className="cursor-pointer flex justify-between text-[13px] font-[600]"></div>
        <div className="flex text-[13px] font-[600] gap-[8px]">
          <input
            required
            type="checkbox"
            name="Remember me"
            id="Remember me"
            className=" checked:bg-Vivid_Tangelo"
          />
          <label htmlFor="Remember me">Remember me</label>
        </div>
        <button
          onClick={(e) => e.preventDefault()}
          type="submit"
          className="w-full p-[12px] font-[600] text-center bg-Vivid_Tangelo text-white text-[16px] rounded-[8px]"
        >
          Login
        </button>
        <p className="text-[12px] text-boulder text-center font-[600]">
          Don't have account?{" "}
          <Link href="/register" className="text-Vivid_Tangelo cursor-pointer">
            Register
          </Link>
        </p>
      </form>
    </main>
  );
};

export default Login;
