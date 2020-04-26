import React, { useContext, useState } from 'react';
import TagsInput from 'react-tagsinput';
import 'react-tagsinput/react-tagsinput.css';
import NotesContext from '../context/questions-context';
import Options from '../components/Options';
import AddOption from './AddOption';

const AddQuestion = () => {
    //const { dispatch } = useContext(NotesContext)
    const [title, setTitle] = useState('');
    const [options, setOptions] = useState(['Yes', 'No', 'Maybe']);
    const [tags, setTags] = useState([]);
    const [createdAt, setCreatedAt] = useState(0);
    const [newOption, setNewOption] = useState('');
    const [error, setError] = useState('');

    const handleDeleteOptions = (e) => {
        e.preventDefault();
        setOptions([]);
    }

    const handleDeleteOption = (optionToRemove) => {
        setOptions(options.filter(option => option !== optionToRemove))
    }

    const onSubmitHandler = (e) => {
        e.preventDefault();
        console.log(title);
    }

    const handleAddButton = (event) => {
        event.preventDefault();
        const formInput = newOption.trim();
        const error = handleAddOption(formInput);
        
        setError(error);

        if(!error) {
            setNewOption('');
        }
    };

    const handleAddOption = (option) => {
        if(!option) {
            return 'Enter valid value to add item';
        } else if (options.indexOf(option) > -1) {
            return 'This option already exists';
        }
        setOptions([...options, option]);
    }

    return (
        <div>
            <p>Add a question!</p>
            <form onSubmit={onSubmitHandler}>
                <textarea value={title} onChange={(e) => setTitle(e.target.value)}/>
                <Options options={options} handleDeleteOptions={handleDeleteOptions} handleDeleteOption={handleDeleteOption}/>
                <AddOption handleAddOption={handleAddOption}/>
                <TagsInput value={tags} onChange={(tags) => setTags(tags)}/>
                <button>Submit Question</button>
            </form>

        </div>
        )
}

export default AddQuestion