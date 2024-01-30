import React from 'react';

const InputField = ({type, id, img, name, label, placeholder, value, onChange, required, showOTP, isError}) => {
  return (
    <div className="flex relative flex-col gap-[8px]">
      <label className="block text-[14px] font-semibold text-gray-900" htmlFor={id}>
        {label}
      </label>
      <div
        className={`${
          isError ? 'border-red-600 border-2' : 'focus-within:border-vivid_orange'
        }   border-boulder gap-[8px] rounded-[8px] p-[5px] border flex`}>
        <img src={img} alt="" />
        <input
          type={type}
          id={id}
          name={name}
          placeholder={placeholder}
          onChange={onChange}
          value={value}
          required={required}
          className="focus:outline-none w-full"
          maxLength={name === 'mobile' ? 10 : name === 'otp' ? 6 : ''}
        />
        {showOTP && (
          <button
            type="button"
            className="bg-vivid_orange text-white tracking-[0.8px] py-1 px-2 font-semibold uppercase absolute right-[8px] text-[10px] rounded-[8px]">
            get otp
          </button>
        )}
      </div>
    </div>
  );
};

export default InputField;
