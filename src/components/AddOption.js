import React from 'react';

export default class AddOption extends React.Component {
    state = {
        error: undefined
    };
    // constructor(props) {
    //     super(props);
    //     this.handleFormSubmit = this.handleFormSubmit.bind(this);
    // }
    handleFormSubmit = (event) => {
        event.preventDefault();
        const formInput = event.target.elements.option.value.trim();
        const error = this.props.handleAddOption(formInput);
        
        this.setState(() => ({error}));

        if(!error) {
            event.target.elements.option.value = '';
        }
    };

    render() {
        return (
            <div>
                {this.state.error && <p className="add-option-error">{this.state.error}</p>}
                <form className="add-option" onSubmit={this.handleFormSubmit}>
                    <input className="add-option__input" type="text" name="option"></input>
                    <button className="button">Add Options</button>
                </form>  
            </div>
        );
    }
}