import React from 'react';
import { NavLink } from 'react-router-dom';
import { connect } from 'react-redux';
import { startLogout } from '../actions/auth';

export const Header = ({ startLogout }) => {
    return (
        <header className="header">
            <div className="content-container-header">
                <div className="header__content">
                    <img className="header__img" src="images/logo.png" />
                    <NavLink className="button button--link" to="/add" activeClassName="button button--link-active">
                        <p>Add a Question</p>
                    </NavLink>
                    <NavLink className="button button--link" to="/yourquestions" activeClassName="button button--link-active">
                        <p>Your Questions</p>
                    </NavLink>
                    <NavLink className="button button--link" to="/questions" activeClassName="button button--link-active">
                        <p>Answer Questions</p>
                    </NavLink>
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


//DeSide Title
// <div className="header__logo">
//  <h1 className="header__title">DeSide</h1>
// </div>


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