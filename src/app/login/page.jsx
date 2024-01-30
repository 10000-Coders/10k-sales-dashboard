'use client';
import React, {useState, useEffect} from 'react';
import Link from 'next/link';
import {EyeIcon, MailIcon, PasswordIcon} from '@/shared/svgImages/navBarImages/index';
import {useSelector, useDispatch} from 'react-redux';
import {login} from '@/redux/features/user/userAuth';
import useToast from '@/hooks/useToast';
import SpinnerLoader from '@/components/SpinnerLoader';
import {useRouter} from 'next/navigation';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const handleShowPassword = () => setShowPassword(!showPassword);
  const [formData, setFormData] = useState({email: '', password: ''});

  const dispatch = useDispatch();
  const {user, isLoggedIn, loginLoading} = useSelector(state => state.userAuth);
  const {showSuccessToast, showErrorToast} = useToast();
  const router = useRouter();
  useEffect(() => {
    const redirectTo = window.location.search ? new URLSearchParams(window.location.search).get('redirectTo') : null;
    if (redirectTo) {
      showErrorToast('Please login to access this page', 'top-right', 'light');

      const currentUrl = window.location.href;
      const updatedUrl = currentUrl.replace(`?redirectTo=${encodeURIComponent(redirectTo)}`, '');
      window.history.replaceState({}, document.title, updatedUrl);
    }
  }, []);
  const handleChange = e => {
    const {name, value} = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value,
    }));
  };

  useEffect(() => {
    setFormData(
      prevState => ({
        ...prevState,
        email: user.email,
      }),
      [],
    );
  }, []);

  const {email, password} = formData;

  const handleFormSubmit = async e => {
    e.preventDefault();
    try {
      let response = await dispatch(login(formData));
      const {
        payload: {responseData},
      } = response;

      if (responseData.status | responseData.success) {
        showSuccessToast(responseData.message, 'top-right', 'light');
        if (isLoggedIn && user.salesperson_auth_token) {
          router.push('/unreadrequests');
        }
      } else {
        showErrorToast(responseData.Error, 'top-right', 'light');
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };
  return (
    <main className="h-[100vh] flex items-center justify-center">
      <form
        className={` h-[450px] rounded-[16px] px-[40px] py-[38px] border shadow flex flex-col w-[454px] gap-[24px] bg-white`}
        onSubmit={handleFormSubmit}>
        <p className="text-center w-full text-[24px] font-[600] leading-[normal]">Login</p>
        <div className="flex flex-col gap-[8px]">
          <label className="block text-[13px] font-semibold  text-gray-900" htmlFor="Email">
            Email ID
          </label>
          <div className="border-silver focus-within:border-vivid_orange focus-within:border  w-full gap-[8px] rounded-[8px] py-1 px-[15px] border flex">
            <MailIcon />
            <input
              required
              type="email"
              id="email"
              name="email"
              value={email}
              className="focus:outline-none w-full"
              onChange={handleChange}
            />
          </div>
          <div className="flex w-full flex-col gap-[8px]">
            <label className="block text-[13px] font-semibold  text-gray-900" htmlFor="Password">
              Password
            </label>
            <div className="border-silver px-[15px]  w-full gap-[8px] rounded-[8px] py-1 border items-center flex ">
              <PasswordIcon />
              <input
                required
                type={showPassword ? 'password' : 'text'}
                id="Password"
                name="password"
                value={password}
                className="focus:outline-none w-full"
                onChange={handleChange}
              />
              <div onClick={handleShowPassword}>
                <EyeIcon />
              </div>
            </div>
          </div>
        </div>
        <div className="cursor-pointer flex justify-between text-[13px] font-[600]"></div>
        <div className="flex text-[13px] font-[600] gap-[8px]">
          <input required type="checkbox" name="Remember me" id="Remember me" className=" checked:bg-vivid_orange" />
          <label htmlFor="Remember me">Remember me</label>
        </div>
        {loginLoading ? (
          <button
            type="button"
            className="w-full p-[12px] font-[600] text-center bg-vivid_orange  text-white text-[16px] rounded-[8px]">
            <center>
              <SpinnerLoader />
            </center>
          </button>
        ) : (
          <button
            type="submit"
            className="w-full p-[12px] font-[600] text-center bg-vivid_orange  text-white text-[16px] rounded-[8px]">
            Login
          </button>
        )}

        <p className="text-[12px] text-boulder text-center font-[600]">
          Don't have account?{' '}
          <Link href="/register" className="text-vivid_orange cursor-pointer">
            Register
          </Link>
        </p>
      </form>
    </main>
  );
};

export default Login;
