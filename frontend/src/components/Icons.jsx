import React from 'react';
import reactLogo from '../assets/react.svg'; 

const Placeholder = ({ size = 16, alt = "icon" }) => (
    <img src={reactLogo} alt={alt} style={{ width: size, height: size, filter: "grayscale(100%) opacity(0.7)" }} />
);

export const IconAdd = () => <Placeholder alt="Add" />;
export const IconTrash = () => <Placeholder alt="Delete" />;
export const IconHome = () => <Placeholder alt="Home" />;
export const IconClose = () => <Placeholder alt="Close" />;
export const IconAuthor = () => <Placeholder alt="Author" />;
export const IconModifier = () => <Placeholder alt="Modifier" />;
export const IconSearch = () => <Placeholder alt="Search" />;