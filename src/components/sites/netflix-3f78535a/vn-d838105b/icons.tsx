import React from "react";

export const NetflixLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    className="n-logo-svg"
    focusable="false"
    viewBox="225 0 552 1000"
    aria-hidden="true"
    data-uia="n-logo"
    {...props}
  >
    <defs>
      <radialGradient
        id=":R4qjalal996:-a"
        r="75%"
        gradientTransform="matrix(.38 0 .5785 1 .02 0)"
      >
        <stop offset="60%" stopOpacity=".3"></stop>
        <stop offset="90%" stopOpacity=".05"></stop>
        <stop offset="100%" stopOpacity="0"></stop>
      </radialGradient>
    </defs>
    <path d="M225 0v1000c60-8 138-14 198-17V0H225" fill="#b1060e"></path>
    <path d="M579 0v983c71 3 131 9 198 17V0H579" fill="#b1060e"></path>
    <path
      d="M225 0v200l198 600V557l151 426c76 3 136 9 203 17V800L579 200v240L423 0H225"
      fill="url(#:R4qjalal996:-a)"
    ></path>
    <path d="M225 0l349 983c76 3 136 9 203 17L423 0H225" fill="#e50914"></path>
  </svg>
);

export const ChevronRightIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    role="img"
    {...props}
  >
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="m15.586 12-7.293 7.293 1.414 1.414 8-8a1 1 0 0 0 0-1.414l-8-8-1.414 1.414z"
      clipRule="evenodd"
    ></path>
  </svg>
);
