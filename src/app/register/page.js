"use client";
import React from "react";
import { useState } from "react";
import styles from "./register.module.css";
import InputField from "@/components/InputField";
import {
  Ten_K_Logo,
  EyeIcon,
  LeftArrow,
  PasswordIcon,
} from "@/shared/svgImages/navBarImages";
import Link from "next/link";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    mobileNumber: null,
    otp: null,
    emailId: "",
    whatsApp: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleShowPassword = () => setShowPassword(!showPassword);
  const handleFileChange = (e) => {
    const fileInput = e.target;
    const file = fileInput.files[0];

    if (file) {
      const fileURL = URL.createObjectURL(file);
      fileInput.value = null;
      setSelectedFile(fileURL);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const sanitizedValue =
      name === "mobileNumber" || name === "otp"
        ? value.replace(/\D/g, "")
        : value;
    const inputValue = type === "checkbox" ? checked : sanitizedValue;
    setFormData({
      ...formData,
      [name]: inputValue,
    });
  };
  const handleFormSubmit = (e) => {
    e.preventDefault();
    // handleThankYouModal();
  };
  return (
    <section
      className={`flex flex-col px-[10px] bg- py-[20px] sm:gap-[20px] md:gap-[40px] justify-center items-center bg-azureDream lg:h-[100dvh] lg:w-[100%] sm:w-[100%] bg-Light_Cyan`}
    >
      <Link
        href="/login"
        className="flex absolute cursor-pointer top-[50px] left-[80px] border bg-white px-[15px] items-center py-[10px] rounded-[16px] shadow gap-[10px] font-[700] text-[12px] tracking-wide"
      >
        <LeftArrow fill="black" /> <span className="uppercase"> go Back</span>
      </Link>
      <Ten_K_Logo />
      <form
        onSubmit={handleFormSubmit}
        className={`w-[454px] gap-[24px] border shadow flex flex-col rounded-[16px] h-[564px] bg-white px-[40px] py-[38px]`}
      >
        <p className="text-center sm:text-[20px] md:text-[24px] font-semibold leading-[normal]">
          <span className={`${styles.text_linear_gradient}`}>Register</span>{" "}
        </p>
        <InputField
          type="text"
          id="Name"
          name="name"
          label="Name"
          placeholder="Enter your name"
          onChange={handleInputChange}
          value={formData.name}
          required={true}
          img="/profile.svg"
        />
        <InputField
          type="email"
          id="EmailID"
          name="emailId"
          label="Email ID"
          placeholder="Enter your email address"
          onChange={handleInputChange}
          value={formData.emailId}
          required={true}
          img="/mail.svg"
        />
        <div className="flex w-full flex-col gap-[8px]">
          <label
            className="block font-semibold text-[14px] text-gray-900"
            htmlFor="Password"
          >
            Password
          </label>
          <div className="border-silver px-[15px] focus-within:border-vivid_orange w-full gap-[8px] rounded-[8px] py-1 border items-center flex ">
            <div onClick={handleShowPassword}>
              <PasswordIcon />
            </div>
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
          <div className="flex items-center gap-[24px]">
            <div className="flex gap-[8px] w-[152px] flex-col">
              <p className="text-[12px] font-[600] leading-[normal]">
                Upload Profile Pic
              </p>
              <label className="w-full p-[12px] font-[400] text-center text-vivid_orange border border-vivid_orange text-[13px] rounded-[8px] cursor-pointer">
                {selectedFile ? "Selected File" : "Select File "}
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
            {selectedFile && (
              <div className="overflow-hidden rounded-[8px] relative border-silver h-[60px] w-[60px]">
                <div className="top-[2px] border-[3px] border-red-500 bg-white rounded-full right-[2px] p-1 absolute">
                  <img
                    onClick={() => setSelectedFile(null)}
                    className="h-2 w-2 cursor-pointer"
                    src="/Register_Images/cross-mark-svgrepo-com.svg"
                    alt=""
                  />
                </div>
                <img
                  draggable={false}
                  src={selectedFile}
                  className="h-full w-full"
                  alt=""
                />
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-[16px]">
          <div className="flex gap-[8px]">
            <input
              required
              type="checkbox"
              name="whatsApp"
              id="whatsApp"
              onChange={handleInputChange}
              value={formData.whatsApp}
            />
            <label htmlFor="whatsApp">
              I want to receive updates on WhatsApp
            </label>
          </div>
          <button
            type="submit"
            className="w-full p-[12px] font-[600] text-center bg-vivid_orange text-white text-[16px] rounded-[8px]"
          >
            Send Request
          </button>
        </div>
      </form>
    </section>
  );
};

export default Register;
