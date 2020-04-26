import React from 'react';

const Option = (props) => (
    <div>
        <p>{props.count}. {props.optionText} </p>
        <button 
            onClick={(e) => {
                e.preventDefault();
                props.handleDeleteOption(props.optionText)
            }}
        >
            Remove
        </button>
    </div>
);

export default Option;