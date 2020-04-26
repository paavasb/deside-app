import React, { useContext, useState } from 'react';
import TagsInput from 'react-tagsinput';
import 'react-tagsinput/react-tagsinput.css';
import NotesContext from '../context/questions-context';
import Options from '../components/Options';

const AddQuestion = () => {
    //const { dispatch } = useContext(NotesContext)
    const [title, setTitle] = useState('');
    const [options, setOptions] = useState(['Yes', 'No', 'Maybe']);
    const [tags, setTags] = useState([]);
    const [createdAt, setCreatedAt] = useState(0);

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

    return (
        <div>
            <p>Add a question!</p>
            <form onSubmit={onSubmitHandler}>
                <textarea value={title} onChange={(e) => setTitle(e.target.value)}/>
                <Options options={options} handleDeleteOptions={handleDeleteOptions} handleDeleteOption={handleDeleteOption}/>
                <TagsInput value={tags} onChange={(tags) => setTags(tags)}/>
                <button>Submit Question</button>
            </form>

        </div>
        )
}

export default AddQuestion