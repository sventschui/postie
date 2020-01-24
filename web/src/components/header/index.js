import { h } from 'preact';
import { Link } from 'preact-router/match';

const Header = () => (
	<div className="wrapper">
		<header className="header">
			<h1>postie</h1>
			<div className="search" >
				<input type="text" placeholder="search" />
			</div>
		</header>
		<style jsx>{`
			.wrapper {
				/* wrapper to not have the header overlap stuff */
				height: 56px;
			}

			.header {
				position: fixed;
				left: 0;
				top: 0;
				width: 100%;
				height: 56px;
				padding: 0;
				z-index: 50;
				border-bottom: 1px solid #eee;
				display: flex;
				justify-content: space-between;
				align-items: center;
				background: #fff;
			}
			
			.header h1 {
				float: left;
				margin: 0;
				padding: 0 15px;
				font-size: 24px;
				line-height: 56px;
				font-weight: 400;
			}

			.search {
				flex: 1;
				padding: 0 10px;
			}

			.search input[type=text] {
				background: #eee;
				border: none;
				border-radius: 3px;
				margin: 0;
				width: 100%;
			}
		`}</style>
	</div>
);

export default Header;
