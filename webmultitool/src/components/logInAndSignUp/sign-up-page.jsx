import React from "react";
import Image from "./image";
import SignUp from "./sign-up";
import "./sign-up-page.css";

const SignUpPage = () => {
  return (
    <div className="sign-up-page">
      <div className="sign-up-page__image">
        <Image />
      </div>
      <div className="sign-up-page__block">
        <SignUp />
      </div>
    </div>
  );
};

export default SignUpPage;
