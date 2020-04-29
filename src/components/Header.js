import React from 'react';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import { startLogout } from '../actions/auth';

export const Header = ({ startLogout }) => {
    return (
        <header className="header">
            <div className="content-container-header">
                <div className="header__content">
                    <h1 className="header__title">DeSide</h1>
                    <Link className="button button--link" to="/add" >
                        <p>Add a Question</p>
                    </Link>
                    <Link className="button button--link" to="/yourquestions" >
                        <p>Your Questions</p>
                    </Link>
                    <Link className="button button--link" to="/questions" >
                        <p>Answer Questions</p>
                    </Link>
                    <button className="button button--logout" onClick={startLogout}>Logout</button>
                </div>
            </div>
        </header>
    )
}

const mapDispatchToProps = (dispatch) => ({
    startLogout: () => dispatch(startLogout())
});

export default connect(undefined, mapDispatchToProps)(Header);

// import React from 'react';

// const Header = (props) => (
//     <div className="header">
//         <div className="container">
//             <h1 className="header__title">{props.title}</h1>
//             {props.subtitle && <h2 className="header__subtitle">{props.subtitle}</h2>}
//         </div>
//     </div>
// );

// Header.defaultProps = {
//     title: 'DeSide App',
//     subtitle: 'Let others decide'
// }

// export default Header;