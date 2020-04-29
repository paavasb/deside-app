import React, { useContext } from 'react'
import YourQuestion from './YourQuestion'
import questionsList from '../playground/questions'
import QuestionsContext from '../context/questions-context'
import { firebase } from '../firebase/firebase';

const YourQuestions = () => {
    const { questions, dispatch } = useContext(QuestionsContext)
    //const [questions, setQuestions] = useState(questionsList)
    return (
        <div className="content-container">
            {questions.map((question, index) => {
                if(question.creator ===  firebase.auth().currentUser.uid)
                return (
                    <YourQuestion key={question.id} question={question}/>
                )
            })}
        </div>
    )
}

export default YourQuestions