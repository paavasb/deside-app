import React, { useState } from 'react';

const AddOption = (props) => {
    const [error, setError] = useState('');
    const [option, setOption] = useState('');

    const handleSubmit = (event) => {
        event.preventDefault();
        const formInput = option.trim();
        const error = props.handleAddOption(formInput);
        
        setError(error)

        if(!error) {
            setOption('');
        }
    }

    return (
        <div>
            {error && <p className="add-option-error">{error}</p>}
            <div className="add-option">
                <input 
                    value={option} className="add-option__input" 
                    type="text" placeholder="Add Options Here..."
                    onChange={(e) => setOption(e.target.value)} />
                <button className="button button--add-option" onClick={handleSubmit}>Add Option</button>
            </div>  
        </div>
    )
}

export default AddOption