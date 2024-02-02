'use client';
import React from 'react';
import {useState} from 'react';
import styles from './register.module.css';
import InputField from '@/components/InputField';
import {Ten_K_Logo, EyeIcon, LeftArrow, PasswordIcon} from '@/shared/svgImages/navBarImages';
import Link from 'next/link';
import {CrossIcon} from '@/shared/svgImages/register';
import {useSelector, useDispatch} from 'react-redux';
import {registration} from '@/redux/features/user/userAuth';
import useToast from '@/hooks/useToast';
import SpinnerLoader from '@/components/SpinnerLoader';
import {useRouter} from 'next/navigation';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    profile_pic: '',
    otp: null,
    whatsApp: false,
  });
  const [formError, setFormError] = useState({
    name: false,
    email: false,
    mobile: false,
    password: false,
    confirmPassword: false,
    profile_pic: false,
    otp: false,
    whatsApp: false,
  });
  const {showSuccessToast, showErrorToast} = useToast();
  const [showPassword, setShowPassword] = useState({});
  const dispatch = useDispatch();
  const router = useRouter();
  const {user, isLoggedIn, registerLoading} = useSelector(state => state.userAuth);
  const handleShowPassword = fieldName => {
    setShowPassword(prevState => ({
      ...prevState,
      [fieldName]: !prevState[fieldName],
    }));
  };
  const handleFileChange = e => {
    const {name} = e.target;
    const fileInput = e.target;
    const file = fileInput.files[0];

    if (file) {
      const fileURL = URL.createObjectURL(file);
      fileInput.value = null;
      setFormData(prevState => ({
        ...prevState,
        [name]: {
          url: fileURL,
          name: file.name,
        },
      }));
    }
  };

  const deleteImages = name => {
    setFormData({
      ...formData,
      [name]: '',
    });
  };

  const handleInputChange = e => {
    const {name, value, type, checked} = e.target;
    setFormError(prevState => ({...prevState, [name]: false}));
    const sanitizedValue = name === 'mobile' || name === 'otp' ? value.replace(/\D/g, '') : value;
    const inputValue = type === 'checkbox' ? checked : sanitizedValue;
    setFormData(prevState => ({
      ...prevState,
      [name]: inputValue,
    }));
  };

  //Form Validation
  const isFormValid = () => {
    const errors = {};

    Object.entries(formData).forEach(([key, value]) => {
      switch (key) {
        case 'name':
          if (!value.trim()) {
            errors[key] = true;
            showErrorToast('Name Should not be empty', 'top-right', 'light');
          }
          break;
        case 'mobile':
          if (!/^\d{10}$/.test(value)) {
            errors[key] = true;
            showErrorToast('Mobile Number Should equal to 10 digit', 'top-right', 'light');
          }
          break;
        case 'email':
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            errors[key] = true;
          }
          break;
        case 'password':
          if (value.length < 6) {
            errors[key] = true;
            showErrorToast(
              'Password must be greater than 6 characters and include alphanumeric values along with specific symbols.',
              'top-right',
              'light',
            );
          }
          break;
        case 'confirmPassword':
          if (value !== formData['password']) {
            errors[key] = true;
            showErrorToast('Confirm password and password must match.', 'top-right', 'light');
          }
          break;
        default:
          break;
      }
    });

    setFormError(errors);

    // Check if there are any errors
    return Object.values(errors).every(error => !error);
  };

  const handleFormSubmit = async e => {
    e.preventDefault();
    if (isFormValid()) {
      try {
        const {name, email, mobile, password, profile_pic} = formData;
        const userData = {
          name,
          email,
          mobile,
          password,
          profile_pic: profile_pic.url,
        };
        let response = await dispatch(registration(userData));
        // console.log('handleSubmit esponse- ', response);
        const {
          payload: {responseData},
        } = response;

        if (responseData.status) {
          showSuccessToast(responseData.message, 'top-right', 'light');
          if (isLoggedIn && user.salesperson_auth_token) {
            router.push('/unreadrequests');
          }
        } else {
          showErrorToast(responseData.Error, 'top-right', 'light');
        }
      } catch (error) {
        console.error('Registration error:', error);
      }
    }
  };

  const {
    name,
    email,
    mobile,
    password,
    confirmPassword,

    whatsApp,
    profile_pic,
  } = formData;
  return (
    <section
      className={`flex flex-col px-[10px] py-[20px] sm:gap-[20px] md:gap-[40px] justify-center items-center bg-azureDream lg:h-[100dvh] lg:w-[100%] sm:w-[100%] bg-Light_Cyan`}>
      <Link
        href="/login"
        className="flex absolute cursor-pointer top-[50px] left-[80px] border bg-white px-[15px] items-center py-[10px] rounded-[16px] shadow gap-[10px] font-[700] text-[12px] tracking-wide">
        <LeftArrow fill="black" /> <span className="uppercase"> go Back</span>
      </Link>
      <Ten_K_Logo />
      <form
        onSubmit={handleFormSubmit}
        className={`w-[510px] gap-[8px] 2xl:gap-[16px] border shadow flex flex-col rounded-[16px] h-[700px] bg-white px-[40px] py-[38px]`}>
        <p className="text-center sm:text-[20px] md:text-[24px] font-semibold leading-[normal]">
          <span className={`${styles.text_linear_gradient}`}>Register As Mentor</span>{' '}
        </p>
        <InputField
          type="text"
          id="Name"
          name="name"
          label="Name"
          placeholder="Enter Your Name"
          onChange={handleInputChange}
          value={name}
          required={true}
          img="/profile.svg"
          isError={formError['name']}
        />
        <InputField
          type="email"
          id="Email"
          name="email"
          label="Email ID"
          placeholder="Enter Your Email Address"
          onChange={handleInputChange}
          value={email}
          required={true}
          img="/mail.svg"
          isError={formError['email']}
        />
        <InputField
          type="tel"
          id="Mobile"
          name="mobile"
          label="Mobile Number"
          placeholder="Enter Your Mobile Number"
          onChange={handleInputChange}
          value={mobile}
          required={true}
          img="/RequestCallBack_images/call.svg"
          showOTP={false}
          isError={formError['mobile']}
        />
        <div className="flex w-full flex-col gap-[8px] 2xl:gap-[12px]">
          <label className="block font-semibold text-[14px] text-gray-900" htmlFor="Password">
            Password
          </label>
          <div
            className={`${
              formError['password'] ? 'border-red-600 border-2' : 'focus-within:border-vivid_orange'
            } border-silver px-[15px]  w-full gap-[8px] rounded-[8px] py-1 border items-center flex `}>
            <PasswordIcon />
            <input
              required
              type={showPassword.password ? 'text' : 'password'}
              id="Password"
              name="password"
              value={password}
              className="focus:outline-none w-full"
              onChange={handleInputChange}
            />
            <div onClick={() => handleShowPassword('password')}>
              <EyeIcon />
            </div>
          </div>
          <label className="block font-semibold text-[14px] text-gray-900" htmlFor="Confirm Password">
            Confirm Password
          </label>
          <div
            className={`${
              formError['confirmPassword'] ? 'border-red-600 border-2' : 'focus-within:border-vivid_orange'
            } border-silver px-[15px]   w-full gap-[8px] rounded-[8px] py-1 border items-center flex`}>
            <PasswordIcon />
            <input
              required
              type={showPassword.confirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              name="confirmPassword"
              value={confirmPassword}
              className="focus:outline-none w-full"
              onChange={handleInputChange}
            />
            <div onClick={() => handleShowPassword('confirmPassword')}>
              <EyeIcon />
            </div>
          </div>
          <div className="flex items-center">
            <div className="flex gap-[8px] w-[152px] flex-col">
              <p className="text-[12px] font-[600] leading-[normal] mt-1">Upload Profile Pic</p>
              <span className="text-[10px] font-[500] mt-[-8px]">(.jpg, .png, .svg, .webp)</span>
              <label className="w-full p-[12px] font-[400] text-center text-vivid_orange border border-vivid_orange text-[13px] rounded-[8px] cursor-pointer">
                {profile_pic.url ? 'Selected File' : 'Select File '}
                <input type="file" className="hidden" name="profile_pic" onChange={handleFileChange} />
              </label>
            </div>
            {profile_pic.url && (
              <div className="flex-row  ml-3 mt-3">
                <div className="overflow-hidden rounded-[8px] relative border-silver h-[60px] w-[60px]">
                  <div className="top-[2px] border-[3px] border-red-500 bg-white rounded-full right-[2px] p-1 absolute">
                    <span onClick={() => deleteImages('profile_pic')} className="h-2 w-2 cursor-pointer">
                      <CrossIcon width="8px" height="8px" />
                    </span>
                  </div>
                  <img draggable={false} src={profile_pic.url} className="h-full w-full" alt={profile_pic.name} />
                </div>
                <span className="text-dark text-xs text-gray-600">{profile_pic.name}</span>
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
              value={whatsApp}
            />
            <label htmlFor="whatsApp">I want to receive updates on WhatsApp</label>
          </div>
          {registerLoading ? (
            <button
              type="button"
              className="w-full p-[12px] font-[600] text-center bg-vivid_orange text-white text-[16px] rounded-[8px]">
              <center>
                <SpinnerLoader />
              </center>
            </button>
          ) : (
            <button
              type="submit"
              className="w-full p-[12px] font-[600] text-center bg-vivid_orange text-white text-[16px] rounded-[8px]">
              Send Request
            </button>
          )}
        </div>
      </form>
    </section>
  );
};

export default Register;
